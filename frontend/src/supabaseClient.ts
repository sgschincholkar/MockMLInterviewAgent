import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://jcbgllwakmiosojixfwp.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjYmdsbHdha21pb3Nvaml4ZndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjg5OTgsImV4cCI6MjA5MTMwNDk5OH0.QqxwsyPST8a0HERx65Z-1VfUazZP1mvj5gxpQGAV_To";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
