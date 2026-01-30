from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from prisma import Json, Prisma


class PassageNotFoundError(Exception):
    """Raised when a passage cannot be found."""
    pass


class SnapshotNotFoundError(Exception):
    """Raised when a snapshot cannot be found."""
    pass


class InvalidDateFormatError(Exception):
    """Raised when a date format is invalid."""
    pass


async def create_snapshot(db: Prisma, passage_id: str, snapshot_data: Any) -> Dict[str, str]:
    """
    Create a new AI snapshot when prefill completes.
    
    Args:
        passage_id: The ID of the passage.
        snapshot_data: The AI-generated data to snapshot.
        
    Returns:
        A dictionary with the snapshotId.
        
    Raises:
        PassageNotFoundError: If the passage does not exist.
    """
    existing_passage = await db.passage.find_unique(where={"id": passage_id})
    if not existing_passage:
        raise PassageNotFoundError(f"Passage not found: {passage_id}")
    
    snapshot_data_dict = snapshot_data if isinstance(snapshot_data, dict) else {}
    if not snapshot_data_dict:
        snapshot_data_dict = {"participants": [], "events": [], "relations": [], "discourse": []}
    
    snapshot = await db.aisnapshot.create(
        data={
            "passage": {"connect": {"id": passage_id}},
            "snapshotData": Json(snapshot_data_dict)
        }
    )
    
    ai_count = _calculate_ai_item_count(snapshot_data_dict)
    await _update_or_create_metrics_summary(db, passage_id, ai_count)
        
    return {"snapshotId": snapshot.id}


async def log_edit(
    db: Prisma,
    snapshot_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    is_ai_generated: bool = False
) -> Dict[str, str]:
    """
    Log a user edit action.
    
    Args:
        snapshot_id: The ID of the associated snapshot.
        action: The action type (create, update, delete).
        entity_type: The type of entity being edited.
        entity_id: The ID of the entity.
        field_name: Optional name of the field being edited.
        old_value: Optional old value.
        new_value: Optional new value.
        is_ai_generated: Whether the entity was AI-generated.
        
    Returns:
        A dictionary with status.
        
    Raises:
        SnapshotNotFoundError: If the snapshot does not exist.
    """
    snapshot = await db.aisnapshot.find_unique(
        where={"id": snapshot_id},
        include={"passage": True}
    )
    if not snapshot:
        raise SnapshotNotFoundError("Snapshot not found")
        
    await db.editlog.create(
        data={
            "snapshotId": snapshot_id,
            "action": action,
            "entityType": entity_type,
            "entityId": entity_id,
            "fieldName": field_name,
            "oldValue": str(old_value) if old_value is not None else None,
            "newValue": str(new_value) if new_value is not None else None,
            "isAiGenerated": is_ai_generated
        }
    )
    
    await _update_metrics_summary_for_edit(
        db, snapshot.passageId, action, entity_type, field_name, is_ai_generated
    )
            
    return {"status": "success"}


async def get_aggregate_metrics(
    db: Prisma,
    time_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get global aggregated metrics for admin dashboard.
    
    Args:
        time_range: Predefined range (today, week, month, all).
        start_date: Optional start date in ISO format.
        end_date: Optional end date in ISO format.
        
    Returns:
        A dictionary with totals, top changed fields, recent value changes, and passage stats.
        
    Raises:
        InvalidDateFormatError: If date format is invalid.
    """
    date_filter, end_date_filter = _parse_date_filters(time_range, start_date, end_date)
    date_where = _build_date_where(date_filter, end_date_filter)
    
    edit_stats = await _calculate_edit_stats(db, date_where)
    ai_item_count = await _calculate_ai_item_count_from_snapshots(db, date_where)
    value_changes = await _get_recent_value_changes(db, date_where)
    passage_stats = await _get_passage_stats(db, date_where)
    
    total_ai_items = ai_item_count
    
    return {
        "totals": {
            "ai_items": total_ai_items,
            "modified": edit_stats["modified"],
            "deleted": edit_stats["deleted"],
            "added": edit_stats["added"],
            "modification_rate": (edit_stats["modified"] / total_ai_items * 100) if total_ai_items > 0 else 0
        },
        "top_changed_fields": edit_stats["top_fields"][:10],
        "recent_value_changes": value_changes,
        "passage_stats": passage_stats,
        "filter_applied": {
            "time_range": time_range,
            "start_date": start_date,
            "end_date": end_date,
            "date_filter_from": date_filter.isoformat() if date_filter else None,
            "date_filter_to": end_date_filter.isoformat() if end_date_filter else None
        }
    }


def _calculate_ai_item_count(snapshot_data: Dict[str, Any]) -> int:
    """Calculate the total number of AI-generated items in a snapshot."""
    count = 0
    if snapshot_data and isinstance(snapshot_data, dict):
        count += len(snapshot_data.get("participants", []))
        count += len(snapshot_data.get("events", []))
        count += len(snapshot_data.get("relations", []))
        count += len(snapshot_data.get("discourse", []))
    return count


async def _update_or_create_metrics_summary(db: Prisma, passage_id: str, ai_count: int) -> None:
    """Update or create a metrics summary for a passage."""
    existing_summary = await db.metricssummary.find_unique(
        where={"passageId": passage_id}
    )
    
    if existing_summary:
        await db.metricssummary.update(
            where={"id": existing_summary.id},
            data={"aiItemCount": ai_count}
        )
    else:
        await db.metricssummary.create(
            data={
                "passageId": passage_id,
                "aiItemCount": ai_count,
                "fieldsChanged": Json({})
            }
        )


async def _update_metrics_summary_for_edit(
    db: Prisma,
    passage_id: str,
    action: str,
    entity_type: str,
    field_name: Optional[str],
    is_ai_generated: bool
) -> None:
    """Update metrics summary based on an edit action."""
    summary = await db.metricssummary.find_unique(
        where={"passageId": passage_id}
    )
    
    if summary:
        update_data = {}
        fields_changed = summary.fieldsChanged or {}
        
        if action == "create":
            update_data["addedCount"] = summary.addedCount + 1
        elif action == "delete" and is_ai_generated:
            update_data["deletedCount"] = summary.deletedCount + 1
        elif action == "update" and is_ai_generated:
            update_data["modifiedCount"] = summary.modifiedCount + 1
            if field_name:
                key = f"{entity_type}.{field_name}"
                fields_changed[key] = fields_changed.get(key, 0) + 1
                update_data["fieldsChanged"] = Json(fields_changed)
                
        if update_data:
            await db.metricssummary.update(
                where={"id": summary.id},
                data=update_data
            )


def _parse_date_filters(
    time_range: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str]
) -> tuple:
    """Parse and validate date filters."""
    date_filter = None
    end_date_filter = None
    now = datetime.utcnow()
    
    if time_range:
        if time_range == "today":
            date_filter = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "week":
            date_filter = now - timedelta(days=7)
        elif time_range == "month":
            date_filter = now - timedelta(days=30)
    elif start_date:
        try:
            date_filter = datetime.fromisoformat(start_date)
        except ValueError:
            raise InvalidDateFormatError("Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end_date_filter = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
        except ValueError:
            raise InvalidDateFormatError("Invalid end_date format. Use YYYY-MM-DD")
    
    return date_filter, end_date_filter


def _build_date_where(date_filter: Optional[datetime], end_date_filter: Optional[datetime]) -> Dict[str, Any]:
    """Build the date where clause for queries."""
    date_where: Dict[str, Any] = {}
    
    if date_filter:
        date_where["createdAt"] = {"gte": date_filter}
        if end_date_filter:
            date_where["createdAt"] = {"gte": date_filter, "lte": end_date_filter}
    elif end_date_filter:
        date_where["createdAt"] = {"lte": end_date_filter}
    
    return date_where


async def _calculate_edit_stats(db: Prisma, date_where: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate edit statistics from edit logs."""
    all_edits = await db.editlog.find_many(
        where=date_where if date_where else None
    )
    
    modified = sum(1 for e in all_edits if e.action == "update" and e.isAiGenerated)
    deleted = sum(1 for e in all_edits if e.action == "delete" and e.isAiGenerated)
    added = sum(1 for e in all_edits if e.action == "create")
    
    all_fields_changed: Dict[str, int] = {}
    for e in all_edits:
        if e.action == "update" and e.isAiGenerated and e.fieldName:
            key = f"{e.entityType}.{e.fieldName}"
            all_fields_changed[key] = all_fields_changed.get(key, 0) + 1
    
    sorted_fields = sorted(
        [{"field": k, "count": v} for k, v in all_fields_changed.items()],
        key=lambda x: x["count"],
        reverse=True
    )
    
    return {
        "modified": modified,
        "deleted": deleted,
        "added": added,
        "top_fields": sorted_fields
    }


async def _calculate_ai_item_count_from_snapshots(db: Prisma, date_where: Dict[str, Any]) -> int:
    """Calculate total AI items from snapshots."""
    snapshots = await db.aisnapshot.find_many(
        where=date_where if date_where else None
    )
    
    total = 0
    for s in snapshots:
        if s.snapshotData and isinstance(s.snapshotData, dict):
            total += len(s.snapshotData.get("participants", []))
            total += len(s.snapshotData.get("events", []))
            total += len(s.snapshotData.get("relations", []))
            total += len(s.snapshotData.get("discourse", []))
    
    return total


async def _get_recent_value_changes(db: Prisma, date_where: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get recent value changes from edit logs."""
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
    
    return [
        {
            "entity": l.entityType,
            "field": l.fieldName,
            "from": l.oldValue,
            "to": l.newValue,
            "timestamp": l.createdAt.isoformat()
        }
        for l in recent_logs
    ]


async def _get_passage_stats(db: Prisma, date_where: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get passage-level statistics."""
    if date_where:
        filtered_passages = await db.passage.find_many(where=date_where)
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
    
    return [
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
    ]
