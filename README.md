# OrganMatchAI (DBS Kidney System)

A lightweight web UI for a kidney transplant management demo. It reads data from Supabase (PostgreSQL) and performs a client-side matching analysis based on HLA compatibility, organ availability, waitlist status, donor type, and size fit.

## Features
- Supabase-backed recipients, donors, and HLA test data
- Deep Analysis button recalculates matches in real time
- Urgency from `waiting_list.status`
- Live stats for available organs and active waitlist

## Tech
- HTML, CSS, JavaScript (no framework)
- Supabase REST API

## Configuration
Create a `.env.local` with your Supabase keys:
```
NEXT_PUBLIC_SUPABASE_URL= https://your-project.supabase.co/rest/v1/
NEXT_PUBLIC_SUPABASE_ANON_KEY= your_anon_key
```

If you need to override at runtime, set:
```
window.SUPABASE_URL
window.SUPABASE_ANON_KEY
```

## Database
This UI expects these tables:
- `donor`, `recipient`
- `donor_organ`, `recipient_organ`
- `donor_hla_test`, `recipient_hla_test`
- `waiting_list`

## Run
Open `index.html` directly or serve the folder with any static server.

## Notes
- Ensure RLS allows `SELECT` for the tables above (or disable RLS for testing).
- `.env.local` is ignored by git.
