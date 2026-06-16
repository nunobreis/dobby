-- Sample data for local development
-- Run AFTER schema.sql
-- Replace the user_id values with real UUIDs from your auth.users table

do $$
declare
  v_puppy_id uuid := uuid_generate_v4();
  v_user_id  uuid := '00000000-0000-0000-0000-000000000001'; -- replace with real user UUID
begin

  insert into puppies (id, name, breed, date_of_birth, sex, colour)
  values (v_puppy_id, 'Dobby', 'Golden Retriever', '2024-09-01', 'male', 'Golden');

  insert into puppy_members (puppy_id, user_id)
  values (v_puppy_id, v_user_id);

  insert into vaccinations (puppy_id, vaccine_name, date_given, next_due_date, vet_clinic, created_by)
  values
    (v_puppy_id, 'DHPPi', '2024-10-15', '2025-10-15', 'City Vet Clinic', v_user_id),
    (v_puppy_id, 'Rabies', '2024-11-01', '2025-11-01', 'City Vet Clinic', v_user_id);

  insert into weight_entries (puppy_id, date, weight_kg, created_by)
  values
    (v_puppy_id, '2024-10-01', 3.2, v_user_id),
    (v_puppy_id, '2024-11-01', 6.8, v_user_id),
    (v_puppy_id, '2024-12-01', 11.4, v_user_id),
    (v_puppy_id, '2025-01-01', 16.2, v_user_id),
    (v_puppy_id, '2025-02-01', 20.5, v_user_id);

  insert into vet_visits (puppy_id, date, vet_clinic, reason, outcome, created_by)
  values
    (v_puppy_id, '2024-10-15', 'City Vet Clinic', '8-week check-up + first vaccines', 'Healthy, all clear', v_user_id),
    (v_puppy_id, '2024-11-01', 'City Vet Clinic', '12-week vaccines', 'All good', v_user_id);

  insert into food_entries (puppy_id, brand, product_name, food_type, daily_amount_g, meals_per_day, start_date, created_by)
  values
    (v_puppy_id, 'Royal Canin', 'Golden Retriever Puppy', 'dry', 220, 3, '2024-10-01', v_user_id);

  insert into medications (puppy_id, name, medication_type, dosage, frequency, start_date, end_date, created_by)
  values
    (v_puppy_id, 'Milbemax', 'deworming', '1 tablet', 'Every 3 months', '2024-10-15', '2024-10-15', v_user_id);

  insert into milestones (puppy_id, title, date, notes, created_by)
  values
    (v_puppy_id, 'First day home', '2024-10-01', 'Dobby arrived! So tiny and fluffy.', v_user_id),
    (v_puppy_id, 'First walk outside', '2024-11-10', 'Explored the park for the first time.', v_user_id),
    (v_puppy_id, 'First bath', '2024-11-20', 'Not a fan, but survived!', v_user_id);

end $$;
