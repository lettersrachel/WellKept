// implements REQ-050/051/052 skeleton: the trigger engine worker.
// Field-change events arrive on the queue from the single playbook_field
// repository function (WK-DEV-004 S3: no direct table writes anywhere else).
// Rules: fire-at times household-local (America/New_York, DEV-005);
// packs are scheduled instances that survive source-field edits;
// LIFE-EVENT suppression holds items (suppressed_by_tag), never deletes;
// no client-facing notification 9pm-7am household time.
// Sprint 8 fills this in: engine core + three cascades (kindergarten,
// meds day, occasion radar) before the whole library.
export {};
