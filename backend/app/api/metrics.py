"""
Metrics API Router
Track edits to AI-generated content and provide dashboard statistics
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
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
async def get_aggregate_metrics(
    time_range: Optional[str] = Query(None, description="Time range filter: 'today', 'week', 'month', 'all'"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format: YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format: YYYY-MM-DD)")
):
    """
    Get global aggregated metrics for admin dashboard.
    Supports time filtering by predefined ranges or custom date range.
    
    Time filtering applies to:
    - EditLog.createdAt for edits (modified, deleted, added counts)
    - AISnapshot.createdAt for AI item counts
    - Passage.createdAt for passage-level stats
    """
    db = get_db()
    
    # Calculate date filter
    date_filter = None
    now = datetime.utcnow()
    
    if time_range:
        if time_range == "today":
            date_filter = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "week":
            date_filter = now - timedelta(days=7)
        elif time_range == "month":
            date_filter = now - timedelta(days=30)
        # 'all' means no filter
    elif start_date:
        try:
            date_filter = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    end_date_filter = None
    if end_date:
        try:
            end_date_filter = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    
    # Build date where clause
    date_where: Dict[str, Any] = {}
    if date_filter:
        date_where["createdAt"] = {"gte": date_filter}
        if end_date_filter:
            date_where["createdAt"] = {
                "gte": date_filter,
                "lte": end_date_filter
            }
    elif end_date_filter:
        date_where["createdAt"] = {"lte": end_date_filter}
    
    # ========================================
    # Calculate totals from EditLog (with timestamps)
    # ========================================
    
    # Count edits by action type within the time range
    edit_base_where: Dict[str, Any] = {}
    if date_where:
        edit_base_where = {**date_where}
    
    # Get all edit logs in the time range
    all_edits = await db.editlog.find_many(
        where=edit_base_where if edit_base_where else None
    )
    
    # Calculate totals from actual edit logs
    total_modified = sum(1 for e in all_edits if e.action == "update" and e.isAiGenerated)
    total_deleted = sum(1 for e in all_edits if e.action == "delete" and e.isAiGenerated)
    total_added = sum(1 for e in all_edits if e.action == "create")
    
    # Calculate fields changed from edit logs
    all_fields_changed: Dict[str, int] = {}
    for e in all_edits:
        if e.action == "update" and e.isAiGenerated and e.fieldName:
            key = f"{e.entityType}.{e.fieldName}"
            all_fields_changed[key] = all_fields_changed.get(key, 0) + 1
    
    # Sort fields by frequency
    sorted_fields = sorted(
        [{"field": k, "count": v} for k, v in all_fields_changed.items()], 
        key=lambda x: x["count"], 
        reverse=True
    )
    
    # ========================================
    # Count AI items from AISnapshot (with timestamps)
    # ========================================
    
    snapshot_where: Dict[str, Any] = {}
    if date_where:
        snapshot_where = {**date_where}
    
    snapshots = await db.aisnapshot.find_many(
        where=snapshot_where if snapshot_where else None
    )
    
    total_ai_items = 0
    for s in snapshots:
        if s.snapshotData and isinstance(s.snapshotData, dict):
            total_ai_items += len(s.snapshotData.get("participants", []))
            total_ai_items += len(s.snapshotData.get("events", []))
            total_ai_items += len(s.snapshotData.get("relations", []))
            total_ai_items += len(s.snapshotData.get("discourse", []))
    
    # ========================================
    # Get recent value changes from EditLog
    # ========================================
    
    log_where: Dict[str, Any] = {
        "action": "update",
        "isAiGenerated": True
    }
    if date_where:
        log_where = {**log_where, **date_where}
    
    recent_logs = await db.editlog.find_many(
        where=log_where,
        take=50,
        order={"createdAt": "desc"}
    )
    
    value_changes = [
        {
            "entity": l.entityType,
            "field": l.fieldName,
            "from": l.oldValue,
            "to": l.newValue,
            "timestamp": l.createdAt.isoformat()
        }
        for l in recent_logs
    ]
    
    # ========================================
    # Get passage-level stats
    # ========================================
    
    # For passage stats, we get summaries but also filter by passage creation date if needed
    passage_where: Dict[str, Any] = {}
    if date_where:
        passage_where = {**date_where}
    
    if passage_where:
        filtered_passages = await db.passage.find_many(where=passage_where)
        passage_ids = [p.id for p in filtered_passages]
        
        if passage_ids:
            summaries = await db.metricssummary.find_many(
                where={"passageId": {"in": passage_ids}},
                include={"passage": True}
            )
        else:
            summaries = []
    else:
        summaries = await db.metricssummary.find_many(
            include={"passage": True}
        )
    
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
                "reference": s.passage.reference if s.passage else "Unknown",
                "modified": s.modifiedCount,
                "deleted": s.deletedCount,
                "added": s.addedCount,
                "ai_count": s.aiItemCount,
                "created_at": s.passage.createdAt.isoformat() if s.passage else None,
                "updated_at": s.updatedAt.isoformat() if s.updatedAt else None
            }
            for s in summaries
        ],
        "filter_applied": {
            "time_range": time_range,
            "start_date": start_date,
            "end_date": end_date,
            "date_filter_from": date_filter.isoformat() if date_filter else None,
            "date_filter_to": end_date_filter.isoformat() if end_date_filter else None
        }
    }
