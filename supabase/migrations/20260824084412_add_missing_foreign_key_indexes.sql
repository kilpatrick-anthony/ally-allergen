-- Cover foreign-key columns so deletes/updates of referenced rows and common
-- joins do not require full scans of the referencing tables.

create index if not exists audit_log_changed_by_idx
  on public.audit_log (changed_by);
create index if not exists compliance_audit_changed_by_idx
  on public.compliance_audit (changed_by);
create index if not exists datasheets_created_by_idx
  on public.datasheets (created_by);
create index if not exists device_offline_alerts_site_id_idx
  on public.device_offline_alerts (site_id);
create index if not exists device_pairing_codes_site_id_idx
  on public.device_pairing_codes (site_id);
create index if not exists ingredients_created_by_idx
  on public.ingredients (created_by);
create index if not exists menu_items_label_verified_by_idx
  on public.menu_items (label_verified_by);
create index if not exists page_views_site_id_idx
  on public.page_views (site_id);
create index if not exists pdf_download_events_user_id_idx
  on public.pdf_download_events (user_id);
create index if not exists pdf_downloads_site_id_idx
  on public.pdf_downloads (site_id);
create index if not exists qr_code_scans_site_id_idx
  on public.qr_code_scans (site_id);
create index if not exists supplier_notes_created_by_idx
  on public.supplier_notes (created_by);
create index if not exists suppliers_created_by_idx
  on public.suppliers (created_by);

create index if not exists training_certificates_course_id_idx
  on public.training_certificates (course_id);
create index if not exists training_certificates_enrollment_id_idx
  on public.training_certificates (enrollment_id);
create index if not exists training_certificates_user_id_idx
  on public.training_certificates (user_id);
create index if not exists training_courses_created_by_idx
  on public.training_courses (created_by);
create index if not exists training_enrollments_assigned_by_idx
  on public.training_enrollments (assigned_by);
create index if not exists training_enrollments_course_id_idx
  on public.training_enrollments (course_id);
create index if not exists training_enrollments_user_id_idx
  on public.training_enrollments (user_id);
create index if not exists training_external_evidence_user_id_idx
  on public.training_external_evidence (user_id);
create index if not exists training_external_evidence_verified_by_idx
  on public.training_external_evidence (verified_by);
create index if not exists training_notifications_business_id_idx
  on public.training_notifications (business_id);
create index if not exists training_notifications_enrollment_id_idx
  on public.training_notifications (enrollment_id);
create index if not exists training_notifications_user_id_idx
  on public.training_notifications (user_id);
create index if not exists training_quiz_attempts_module_id_idx
  on public.training_quiz_attempts (module_id);
create index if not exists training_requirements_course_id_idx
  on public.training_requirements (course_id);
create index if not exists training_requirements_created_by_idx
  on public.training_requirements (created_by);
