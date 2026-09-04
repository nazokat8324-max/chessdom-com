-- PostgreSQL schema for Just Chess

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rating INTEGER DEFAULT 1500,
    stats JSONB DEFAULT '{"wins":0,"losses":0,"draws":0}'::jsonb,
    stats_by_mode JSONB DEFAULT '{"rapid":{"wins":0,"losses":0,"draws":0},"blitz":{"wins":0,"losses":0,"draws":0},"bullet":{"wins":0,"losses":0,"draws":0}}'::jsonb,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    result VARCHAR(20) NOT NULL,
    opponent VARCHAR(100) DEFAULT 'Lokal',
    mode VARCHAR(50) DEFAULT 'Lokal o\'yin',
    time_control VARCHAR(20) DEFAULT 'blitz',
    moves JSONB DEFAULT '[]'::jsonb,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
