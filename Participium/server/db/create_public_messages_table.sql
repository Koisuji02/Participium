-- Migration: Create public_messages table for citizen-officer communication
CREATE TABLE IF NOT EXISTS public_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('citizen', 'officer')),
  sender_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN DEFAULT 0,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_public_messages_report_id ON public_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_public_messages_created_at ON public_messages(created_at);
