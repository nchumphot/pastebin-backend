CREATE TABLE pastes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) DEFAULT 'Untitled',
  body TEXT NOT NULL,
  creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);