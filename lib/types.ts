export interface Puppy {
  id: string;
  name: string;
  breed: string;
  date_of_birth: string;
  sex: "male" | "female" | null;
  colour: string | null;
  fur_type: string[] | null;
  microchip_number: string | null;
  legal_owner: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface PuppyMember {
  id: string;
  puppy_id: string;
  user_id: string;
  joined_at: string;
}

export interface Vaccination {
  id: string;
  puppy_id: string;
  vaccine_name: string;
  date_given: string;
  next_due_date: string | null;
  batch_number: string | null;
  vet_clinic: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface WeightEntry {
  id: string;
  puppy_id: string;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface VetVisit {
  id: string;
  puppy_id: string;
  date: string;
  vet_clinic: string | null;
  reason: string;
  outcome: string | null;
  next_appointment_date: string | null;
  next_appointment_reason: string | null;
  cost: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FoodEntry {
  id: string;
  puppy_id: string;
  brand: string;
  product_name: string;
  food_type: "dry" | "wet" | "raw" | "mixed" | null;
  daily_amount_g: number | null;
  meals_per_day: number | null;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Medication {
  id: string;
  puppy_id: string;
  name: string;
  medication_type: "deworming" | "flea_tick" | "antibiotic" | "other" | null;
  dosage: string | null;
  frequency: string | null;
  start_date: string;
  end_date: string | null;
  prescribed_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  puppy_id: string;
  title: string;
  date: string;
  notes: string | null;
  photo_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  puppy_id: string;
  title: string;
  category: "insurance" | "certificates" | "vet_records" | "other" | null;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  document_date: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export type VaccinationStatus = "up_to_date" | "due_soon" | "overdue";
