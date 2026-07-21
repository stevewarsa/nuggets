import os
import sqlite3
import pymysql
from pymysql.cursors import DictCursor

# --- CONFIGURATION ---
SQLITE_DB_PATH = r'C:\xampp\htdocs\bible\api\db\memory_Al.db'
DRY_RUN = False  # Set to False to actually execute inserts on MariaDB

MARIADB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'devuser',
    'password': 'Galatians2v20',
    'database': 'nuggets',
    'port': 3306,
    'charset': 'utf8mb4',
    'cursorclass': DictCursor
}

# The target MariaDB database adds a required 'user_id' column to many tables.
DEFAULT_USER_ID = 2  # Assigned integer for FredJones

# --- TABLE MAPPING CONFIGURATION ---
# Every legacy primary key column is omitted to let MariaDB handle auto-increment natively.
MIGRATION_MAP = {
    'additional_link': {
        'target': 'additional_link',
        'columns': ['key_tx', 'label', 'action', 'created_dt'],
        'insert_query': """INSERT INTO additional_link (user_id, key_tx, label, action, created_dt) VALUES (%s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'quote': {
        'target': 'quote',
        'columns': ['quote_tx', 'sent_from_user', 'approved', 'source_id'],
        'insert_query': """INSERT INTO quote (user_id, quote_tx, sent_from_user, approved, source_id) VALUES (%s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'nugget': {
        'target': 'nugget',
        'columns': ['book_id', 'chapter', 'start_verse', 'end_verse'],
        'insert_query': """INSERT INTO nugget (user_id, book_id, chapter, start_verse, end_verse) VALUES (%s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'prayer': {
        'target': 'prayer',
        'columns': ['prayer_title_tx', 'prayer_desc_tx', 'prayer_subject_person_nm', 'date_added', 'archive_fl'],
        'insert_query': """INSERT INTO prayer (user_id, prayer_title_tx, prayer_desc_tx, prayer_subject_person_nm, date_added, archive_fl) VALUES (%s, %s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'reading_plan_progress': {
        'target': 'reading_plan_progress',
        'columns': ['day_of_week', 'book_name', 'book_id', 'chapter', 'date_read'],
        'insert_query': """INSERT INTO reading_plan_progress (user_id, day_of_week, book_name, book_id, chapter, date_read) VALUES (%s, %s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'history': {
        'target': 'history',
        'columns': ['passage_id', 'date_viewed_str', 'date_viewed_long', 'history_record_type'],
        'insert_query': """INSERT INTO history (user_id, passage_id, date_viewed_str, date_viewed_long, history_record_type) VALUES (%s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'prayer_frequency': {
        'target': 'prayer_frequency',
        'columns': ['prayer_id', 'prayer_priority_cd', 'date_time_added'],
        'insert_query': """INSERT INTO prayer_frequency (prayer_id, prayer_priority_cd, date_time_added) VALUES (%s, %s, %s);""",
        'has_user_id': False
    },
    'prayer_session': {
        'target': 'prayer_session',
        'columns': ['prayer_id', 'user_id', 'prayer_date_time', 'prayer_note_tx'],
        'insert_query': """INSERT INTO prayer_session (prayer_id, user_id, prayer_date_time, prayer_note_tx) VALUES (%s, %s, %s, %s);""",
        'has_user_id': False
    }
}


def migrate_data():
    print(f"Checking for SQLite database file at: {SQLITE_DB_PATH}")
    if not os.path.exists(SQLITE_DB_PATH):
        print("\n[CRITICAL ERROR] File path verification failed!")
        return

    try:
        sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
        sqlite_conn.row_factory = sqlite3.Row
        print("Connected to SQLite database.")
    except Exception as e:
        print(f"Error connecting to SQLite: {e}")
        return

    mariadb_conn = None
    mariadb_cursor = None

    if not DRY_RUN:
        try:
            mariadb_conn = pymysql.connect(**MARIADB_CONFIG)
            mariadb_cursor = mariadb_conn.cursor()
            print("Connected to MariaDB successfully. Live execution mode active.")
            mariadb_cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        except Exception as e:
            print(f"Error connecting to MariaDB: {e}")
            sqlite_conn.close()
            return
    else:
        print("--- !!! DRY RUN MODE ACTIVE !!! ---\n")
        mariadb_cursor = pymysql.cursors.Cursor(connection=None)

    try:
        # Loop through and stream all tables directly using the unified bulk layout
        for source_table, meta in MIGRATION_MAP.items():
            print(f"Migrating table '{source_table}' -> '{meta['target']}'...")
            sqlite_cursor = sqlite_conn.cursor()

            cols_str = ", ".join(meta['columns'])
            sqlite_query = f"SELECT {cols_str} FROM {source_table}"

            sqlite_cursor.execute(sqlite_query)
            rows = sqlite_cursor.fetchall()

            if not rows:
                print(f"  No data found in source table '{source_table}'. Skipping.")
                sqlite_cursor.close()
                continue

            prepared_rows = []
            for row in rows:
                row_data = []
                for col in meta['columns']:
                    row_data.append(row[col])

                final_tuple = tuple(row_data)
                if meta['has_user_id']:
                    prepared_rows.append((DEFAULT_USER_ID,) + final_tuple)
                else:
                    prepared_rows.append(final_tuple)

            if not DRY_RUN:
                mariadb_cursor.executemany(meta['insert_query'], prepared_rows)
                print(f"  Successfully inserted {len(prepared_rows)} rows into '{meta['target']}'.")

            sqlite_cursor.close()

        if not DRY_RUN and mariadb_conn:
            mariadb_conn.commit()
            print("\n[SUCCESS] User 2 data successfully appended via auto-increment keys!")

    except Exception as e:
        if not DRY_RUN and mariadb_conn:
            mariadb_conn.rollback()
        print(f"\n[CRITICAL ERROR] Migration aborted and rolled back: {e}")

    if not DRY_RUN and mariadb_cursor and mariadb_conn:
        mariadb_cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        mariadb_cursor.close()
        mariadb_conn.close()

    sqlite_conn.close()


if __name__ == '__main__':
    migrate_data()
