CREATE TABLE mountains (
    id varchar(80) PRIMARY KEY,
    name text NOT NULL CHECK (length(trim(name)) > 0),
    longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90)
);
