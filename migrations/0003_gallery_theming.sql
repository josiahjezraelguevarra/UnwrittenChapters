ALTER TABLE galleries ADD COLUMN background_color TEXT NOT NULL DEFAULT '';
ALTER TABLE galleries ADD COLUMN surface_color TEXT NOT NULL DEFAULT '';
ALTER TABLE galleries ADD COLUMN text_color TEXT NOT NULL DEFAULT '';
ALTER TABLE galleries ADD COLUMN hero_style TEXT NOT NULL DEFAULT 'banner';
ALTER TABLE galleries ADD COLUMN card_style TEXT NOT NULL DEFAULT 'clean';
ALTER TABLE galleries ADD COLUMN caption_mode TEXT NOT NULL DEFAULT 'hover';
