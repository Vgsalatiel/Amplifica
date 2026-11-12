-- Busca sem acento: "Slipknot", "slipknót" e "SLIPKNOT" passam a achar o mesmo artista.
-- A extensão vem com o PostgreSQL (módulo contrib) e a Neon a permite.
CREATE EXTENSION IF NOT EXISTS unaccent;
