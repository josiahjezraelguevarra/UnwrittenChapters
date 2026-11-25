ALTER TABLE galleries ADD COLUMN font_preset TEXT NOT NULL DEFAULT 'sans';
ALTER TABLE galleries ADD COLUMN accent_color TEXT NOT NULL DEFAULT '';
ALTER TABLE galleries ADD COLUMN grid_gap TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE galleries ADD COLUMN card_radius TEXT NOT NULL DEFAULT 'rounded';
