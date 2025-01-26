export const createURLShortenerTable = `
    CREATE TABLE IF NOT EXISTS url_shortener (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_url TEXT,
        short_code TEXT UNIQUE,
        visit_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT current_timestamp
)`;

export const createShortURL = `
    INSERT INTO url_shortener (original_url, short_code)
    VALUES (?, ?)
`;

export const fetchURLByShortCode = `SELECT original_url FROM url_shortener WHERE short_code = ?`;
