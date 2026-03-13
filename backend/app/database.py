import sqlite3
import datetime
import os

DATABASE_PATH = "./ecoledger.db"

def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT,
            email TEXT UNIQUE,
            phone_number TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'waste_picker',
            wallet_address TEXT UNIQUE,
            city TEXT,
            country TEXT,
            area TEXT,
            profile_photo TEXT,
            id_proof TEXT,
            green_credit_score REAL DEFAULT 0.0,
            total_plastic_collected REAL DEFAULT 0.0,
            account_status TEXT DEFAULT 'active',
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # otp_verifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS otp_verifications (
            otp_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            otp_code TEXT,
            expires_at TIMESTAMP,
            is_verified INTEGER DEFAULT 0,
            attempts INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # token_mints table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS token_mints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet_address TEXT,
            token_id TEXT,
            transaction_hash TEXT,
            explorer_url TEXT,
            plastic_type TEXT DEFAULT '',
            weight_kg REAL DEFAULT 0.0,
            eco_reward REAL DEFAULT 0.0,
            minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # payments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_id TEXT UNIQUE,
            upload_id TEXT,
            picker_user_id TEXT,
            company_id TEXT,
            amount REAL DEFAULT 0.0,
            status TEXT DEFAULT 'paid',
            paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # uploads table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id TEXT UNIQUE,
            picker_user_id TEXT,
            agent_id TEXT,
            company_id TEXT,
            image_url TEXT,
            plastic_type TEXT,
            weight TEXT,
            confidence REAL DEFAULT 0.0,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

class ColumnAttr:
    def __init__(self, name):
        self.name = name
    def __eq__(self, other):
        return (f"{self.name} = ?", other)
    def desc(self):
        return f"{self.name} DESC"

class ModelMeta(type):
    def __getattr__(cls, name):
        # This will catch Payment.picker_user_id etc.
        return ColumnAttr(name)

class TokenMint(metaclass=ModelMeta):
    __tablename__ = "token_mints"
    def __init__(self, **kwargs):
        for k, v in kwargs.items(): setattr(self, k, v)
        # Handle datetime conversion
        if hasattr(self, 'minted_at') and isinstance(self.minted_at, str):
            try:
                # Handle ISO format strings
                val = self.minted_at.split('.')[0] if '.' in self.minted_at else self.minted_at
                self.minted_at = datetime.datetime.fromisoformat(val)
            except: pass

class Payment(metaclass=ModelMeta):
    __tablename__ = "payments"
    def __init__(self, **kwargs):
        for k, v in kwargs.items(): setattr(self, k, v)
        # Handle datetime conversion
        if hasattr(self, 'paid_at') and isinstance(self.paid_at, str):
            try:
                val = self.paid_at.split('.')[0] if '.' in self.paid_at else self.paid_at
                self.paid_at = datetime.datetime.fromisoformat(val)
            except: pass

class Upload(metaclass=ModelMeta):
    __tablename__ = "uploads"
    def __init__(self, **kwargs):
        for k, v in kwargs.items(): setattr(self, k, v)
        if hasattr(self, 'created_at') and isinstance(self.created_at, str):
            try:
                val = self.created_at.split('.')[0] if '.' in self.created_at else self.created_at
                self.created_at = datetime.datetime.fromisoformat(val)
            except: pass

class SessionLocal:
    def __init__(self):
        self.conn = sqlite3.connect(DATABASE_PATH)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()

    def __enter__(self): return self
    def __exit__(self, exc_type, exc_val, exc_tb): self.close()

    def add(self, obj):
        table = obj.__tablename__
        fields = [k for k in obj.__dict__ if k != 'id']
        placeholders = ', '.join(['?'] * len(fields))
        columns = ', '.join(fields)
        values = [getattr(obj, f) for f in fields]
        
        # Convert datetime to string for sqlite
        values = [v.isoformat() if isinstance(v, datetime.datetime) else v for v in values]
        
        sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        self.cursor.execute(sql, values)

    def commit(self): self.conn.commit()
    def close(self): self.conn.close()
    def query(self, model): return Query(self.cursor, model)

class Query:
    def __init__(self, cursor, model):
        self.cursor = cursor
        self.model = model
        self.filters = []
        self._order_by = ""
        self._limit = ""

    def filter(self, condition):
        self.filters.append(condition)
        return self

    def order_by(self, sort_expr):
        self._order_by = f"ORDER BY {sort_expr}"
        return self

    def limit(self, n):
        self._limit = f"LIMIT {n}"
        return self

    def all(self):
        sql = f"SELECT * FROM {self.model.__tablename__}"
        params = []
        if self.filters:
            sql += " WHERE " + " AND ".join([f[0] for f in self.filters])
            params = [f[1] for f in self.filters]
        if self._order_by: sql += " " + self._order_by
        if self._limit: sql += " " + self._limit
        
        self.cursor.execute(sql, params)
        rows = self.cursor.fetchall()
        return [self.model(**dict(row)) for row in rows]

if __name__ == "__main__":
    init_db()
    print("DB Initialized")
