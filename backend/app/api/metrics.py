"""
Metrics API Router
Track edits to AI-generated content and provide dashboard statistics
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
from prisma import Json
from app.core.database import get_db

router = APIRouter()

# --- Pydantic Models ---

class SnapshotCreate(BaseModel):
    passage_id: str
    snapshot_data: Any # Relaxed from Dict[str, Any] to handle generic JSON or empty/null cases

class EditLogCreate(BaseModel):
    snapshot_id: str
    action: str  # "create", "update", "delete"
    entity_type: str
    entity_id: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    is_ai_generated: bool = False

# --- Endpoints ---

@router.post("/snapshot")
async def create_snapshot(data: SnapshotCreate):
    """Create a new AI snapshot when prefill completes"""
    db = get_db()
    
    # Verify the passage exists first
    existing_passage = await db.passage.find_unique(where={"id": data.passage_id})
    if not existing_passage:
        raise HTTPException(status_code=404, detail=f"Passage not found: {data.passage_id}")
    
    # Ensure snapshot_data is a proper dict with structure (not None, not empty)
    snapshot_data_dict = data.snapshot_data if isinstance(data.snapshot_data, dict) else {}
    if not snapshot_data_dict:
        # Provide a minimal valid structure for required Json field
        snapshot_data_dict = {"participants": [], "events": [], "relations": [], "discourse": []}
    
    snapshot = await db.aisnapshot.create(
        data={
            # Use relation connect syntax for the passage
            "passage": {"connect": {"id": data.passage_id}},
            # Wrap dict in prisma.Json() for proper JSON field handling
            "snapshotData": Json(snapshot_data_dict)
        }
    )
    
    # Initialize or update metrics summary
    existing_summary = await db.metricssummary.find_unique(
        where={"passageId": data.passage_id}
    )
    
    # Calculate AI item count
    ai_count = 0
    if snapshot_data_dict and isinstance(snapshot_data_dict, dict):
        if "participants" in snapshot_data_dict:
            ai_count += len(snapshot_data_dict["participants"])
        if "events" in snapshot_data_dict:
            ai_count += len(snapshot_data_dict["events"])
        if "relations" in snapshot_data_dict:
            ai_count += len(snapshot_data_dict["relations"])
        if "discourse" in snapshot_data_dict:
            ai_count += len(snapshot_data_dict["discourse"])
        
    if existing_summary:
        await db.metricssummary.update(
            where={"id": existing_summary.id},
            data={"aiItemCount": ai_count}
        )
    else:
        await db.metricssummary.create(
            data={
                "passageId": data.passage_id,
                "aiItemCount": ai_count,
                "fieldsChanged": Json({})
            }
        )
        
    return {"snapshotId": snapshot.id}

@router.post("/log")
async def log_edit(data: EditLogCreate):
    """Log a user edit action"""
    db = get_db()
    
    # Verify snapshot exists
    snapshot = await db.aisnapshot.find_unique(
        where={"id": data.snapshot_id},
        include={"passage": True}
    )
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
        
    # Create log entry
    await db.editlog.create(
        data={
            "snapshotId": data.snapshot_id,
            "action": data.action,
            "entityType": data.entity_type,
            "entityId": data.entity_id,
            "fieldName": data.field_name,
            "oldValue": str(data.old_value) if data.old_value is not None else None,
            "newValue": str(data.new_value) if data.new_value is not None else None,
            "isAiGenerated": data.is_ai_generated
        }
    )
    
    # Update metrics summary
    summary = await db.metricssummary.find_unique(
        where={"passageId": snapshot.passageId}
    )
    
    if summary:
        update_data = {}
        fields_changed = summary.fieldsChanged or {}
        
        if data.action == "create":
            update_data["addedCount"] = summary.addedCount + 1
        elif data.action == "delete" and data.is_ai_generated:
            update_data["deletedCount"] = summary.deletedCount + 1
        elif data.action == "update" and data.is_ai_generated:
            update_data["modifiedCount"] = summary.modifiedCount + 1
            if data.field_name:
                key = f"{data.entity_type}.{data.field_name}"
                fields_changed[key] = fields_changed.get(key, 0) + 1
                update_data["fieldsChanged"] = Json(fields_changed)
                
        if update_data:
            await db.metricssummary.update(
                where={"id": summary.id},
                data=update_data
            )
            
    return {"status": "success"}

@router.get("/aggregate")
async def get_aggregate_metrics():
    """Get global aggregated metrics for admin dashboard"""
    db = get_db()
    
    # Get all summaries
    summaries = await db.metricssummary.find_many(
        include={"passage": True}
    )
    
    total_ai_items = sum(s.aiItemCount for s in summaries)
    total_modified = sum(s.modifiedCount for s in summaries)
    total_deleted = sum(s.deletedCount for s in summaries)
    total_added = sum(s.addedCount for s in summaries)
    
    # Aggregated fields changed
    all_fields_changed = {}
    for s in summaries:
        if s.fieldsChanged:
            for field, count in s.fieldsChanged.items():
                all_fields_changed[field] = all_fields_changed.get(field, 0) + count
                
    # Sort fields by frequency
    sorted_fields = sorted(
        [{"field": k, "count": v} for k, v in all_fields_changed.items()], 
        key=lambda x: x["count"], 
        reverse=True
    )
    
    # Get recent logs for value patterns
    recent_logs = await db.editlog.find_many(
        where={
            "action": "update",
            "isAiGenerated": True
        },
        take=50,
        order={"createdAt": "desc"}
    )
    
    value_changes = [
        {
            "entity": l.entityType,
            "field": l.fieldName,
            "from": l.oldValue,
            "to": l.newValue
        }
        for l in recent_logs
    ]
    
    return {
        "totals": {
            "ai_items": total_ai_items,
            "modified": total_modified,
            "deleted": total_deleted,
            "added": total_added,
            "modification_rate": (total_modified / total_ai_items * 100) if total_ai_items > 0 else 0
        },
        "top_changed_fields": sorted_fields[:10],
        "recent_value_changes": value_changes,
        "passage_stats": [
            {
                "reference": s.passage.reference,
                "modified": s.modifiedCount,
                "deleted": s.deletedCount,
                "added": s.addedCount,
                "ai_count": s.aiItemCount
            }
            for s in summaries
        ]
    }
