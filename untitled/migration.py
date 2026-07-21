import os
import sqlite3
import pymysql
from pymysql.cursors import DictCursor

# --- CONFIGURATION ---
# Use an absolute raw string (r'...') or forward slashes for Windows paths
SQLITE_DB_PATH = r'C:\xampp\htdocs\bible\api\db\memory_SteveWarsa.db'
DRY_RUN = False  # Set to False to actually execute inserts on MariaDB

MARIADB_CONFIG = {
    'host': '127.0.0.1',       # Points to your local machine (localhost)
    'user': 'devuser',         # Default administrative user
    'password': 'Galatians2v20',
    'database': 'nuggets',     # The target database name
    'port': 3306,              # Default network port for MariaDB
    'charset': 'utf8mb4',      # Essential for special text symbols and accents
    'cursorclass': DictCursor  # Dynamic mapping configuration
}

# The target MariaDB database adds a required 'user_id' column to many tables.
DEFAULT_USER_ID = 1

# --- TABLE MAPPING CONFIGURATION ---
MIGRATION_MAP = {
    'additional_link': {
        'target': 'additional_link',
        'columns': ['key_tx', 'label', 'action', 'created_dt'],
        'insert_query': """INSERT INTO additional_link (user_id, key_tx, label, action, created_dt) VALUES (%s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'history': {
        'target': 'history',
        'columns': ['passage_id', 'date_viewed_str', 'date_viewed_long', 'history_record_type'],
        'insert_query': """INSERT INTO history (user_id, passage_id, date_viewed_str, date_viewed_long, history_record_type) VALUES (%s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'memory_passage': {
        'target': 'memory_passage',
        'columns': ['passage_id', 'preferred_translation_cd', 'last_viewed_str', 'last_viewed_num', 'frequency_days'],
        'insert_query': """INSERT INTO memory_passage (user_id, passage_id, preferred_translation_cd, last_viewed_str, last_viewed_num, frequency_days) VALUES (%s, %s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'nugget': {
        'target': 'nugget',
        'columns': ['nugget_id', 'book_id', 'chapter', 'start_verse', 'end_verse'],
        'insert_query': """INSERT INTO nugget (user_id, nugget_id, book_id, chapter, start_verse, end_verse) VALUES (%s, %s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'passage': {
        'target': 'passage',
        'columns': ['passage_id', 'book_id', 'chapter', 'start_verse', 'end_verse'],
        'insert_query': """INSERT INTO passage (user_id, passage_id, book_id, chapter, start_verse, end_verse) VALUES (%s, %s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'passage_explanation': {
        'target': 'passage_explanation',
        'columns': ['passage_id', 'explanation'],
        'insert_query': """INSERT INTO passage_explanation (passage_id, explanation) VALUES (%s, %s);""",
        'has_user_id': False
    },
    'passage_text_override': {
        'target': 'passage_text_override',
        'columns': ['passage_id', 'verse_num', 'words_of_christ', 'override_text', 'passage_ref_append_letter'],
        'insert_query': """INSERT INTO passage_text_override (passage_id, verse_num, words_of_christ, override_text, passage_ref_append_letter) VALUES (%s, %s, %s, %s, %s);""",
        'has_user_id': False
    },
    'prayer': {
        'target': 'prayer',
        'columns': ['prayer_id', 'prayer_title_tx', 'prayer_desc_tx', 'prayer_subject_person_nm', 'date_added', 'archive_fl'],
        'insert_query': """INSERT INTO prayer (user_id, prayer_id, prayer_title_tx, prayer_desc_tx, prayer_subject_person_nm, date_added, archive_fl) VALUES (%s, %s, %s, %s, %s, %s, %s);""",
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
        'columns': ['session_id', 'prayer_id', 'user_id', 'prayer_date_time', 'prayer_note_tx'],
        'insert_query': """INSERT INTO prayer_session (session_id, prayer_id, user_id, prayer_date_time, prayer_note_tx) VALUES (%s, %s, %s, %s, %s);""",
        'has_user_id': False
    },
    'quote': {
        'target': 'quote',
        'columns': ['quote_id', 'quote_tx', 'sent_from_user', 'approved', 'source_id'],
        'insert_query': """INSERT INTO quote (user_id, quote_id, quote_tx, sent_from_user, approved, source_id) VALUES (%s, %s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'quote_tag': {
        'target': 'quote_tag',
        'columns': ['tag_id', 'quote_id'],
        'insert_query': """INSERT INTO quote_tag (tag_id, quote_id) VALUES (%s, %s);""",
        'has_user_id': False
    },
    'reading_plan_progress': {
        'target': 'reading_plan_progress',
        'columns': ['day_of_week', 'book_name', 'book_id', 'chapter', 'date_read'],
        'insert_query': """INSERT INTO reading_plan_progress (user_id, day_of_week, book_name, book_id, chapter, date_read) VALUES (%s, %s, %s, %s, %s, %s);""",
        'has_user_id': True
    },
    'tag': {
        'target': 'tag',
        'columns': ['tag_id', 'tag_name'],
        'insert_query': """INSERT INTO tag (user_id, tag_id, tag_name) VALUES (%s, %s, %s);""",
        'has_user_id': True
    },
    'tag_nugget': {
        'target': 'tag_nugget',
        'columns': ['tag_id', 'nugget_id'],
        'insert_query': """INSERT INTO tag_nugget (user_id, tag_id, nugget_id) VALUES (%s, %s, %s);""",
        'has_user_id': True
    }
}


def format_sql_preview(cursor, query, data):
    """Safely compiles query and arguments into a printable string using PyMySQL rules."""
    try:
        return cursor.mogrify(query, data)
    except Exception:
        return f"{query} -- WITH DATA: {data}"


def migrate_data():
    # --- AUTOMATIC FILE EXISTENCE CHECK ---
    print(f"Checking for SQLite database file at: {SQLITE_DB_PATH}")
    if not os.path.exists(SQLITE_DB_PATH):
        print("\n[CRITICAL ERROR] File path verification failed!")
        print(f"The file path '{SQLITE_DB_PATH}' does not exist.")
        print("Please check your file name, folder directories, and backslash placement.")
        return

    if not os.path.isfile(SQLITE_DB_PATH):
        print(f"\n[CRITICAL ERROR] '{SQLITE_DB_PATH}' is a directory, not a valid file.")
        return

    print("File found successfully! Continuing with connections...\n")

    # Connect to SQLite source
    try:
        sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
        # Configure the global connection handle row_factory to read named string keys instead of index arrays
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
        print("--- !!! DRY RUN MODE ACTIVE !!! ---")
        print("No structural changes will be written to the MariaDB server.\n")
        mariadb_cursor = pymysql.cursors.Cursor(connection=None)

    for source_table, meta in MIGRATION_MAP.items():
        if DRY_RUN:
            print(f"\n--- [DRY RUN PREVIEW] Table '{source_table}' -> '{meta['target']}' ---")
        else:
            print(f"Migrating table '{source_table}' -> '{meta['target']}'...")

        sqlite_cursor = sqlite_conn.cursor()
        cols_str = ", ".join(meta['columns'])
        sqlite_query = f"SELECT {cols_str} FROM {source_table}"

        try:
            sqlite_cursor.execute(sqlite_query)
            rows = sqlite_cursor.fetchall()

            if not rows:
                print(f"  No data found in source table '{source_table}'. Skipping.")
                sqlite_cursor.close()
                continue

            prepared_rows = []
            for row in rows:
                # Build parameter structures safely matching the columns map configuration names
                row_data = []
                for col in meta['columns']:
                    row_data.append(row[col])

                final_tuple = tuple(row_data)

                # Prepend user_id context safely if multi-tenancy column is tracked
                if meta['has_user_id']:
                    prepared_rows.append((DEFAULT_USER_ID,) + final_tuple)
                else:
                    prepared_rows.append(final_tuple)

            if DRY_RUN:
                for row_data in prepared_rows:
                    formatted_sql = format_sql_preview(mariadb_cursor, meta['insert_query'], row_data)
                    print(formatted_sql)
            else:
                mariadb_cursor.executemany(meta['insert_query'], prepared_rows)
                print(f"  Successfully inserted {len(prepared_rows)} rows into '{meta['target']}'.")

            sqlite_cursor.close()

        except sqlite3.OperationalError:
            print(f"  Skipping '{source_table}': Table does not exist in SQLite source file.")
            sqlite_cursor.close()
        except Exception as e:
            print(f"  Error processing table '{source_table}': {e}")
            sqlite_cursor.close()
            if not DRY_RUN and mariadb_conn:
                mariadb_conn.rollback()
            break
    else:
        if not DRY_RUN and mariadb_conn:
            mariadb_conn.commit()

if __name__ == '__main__':
    migrate_data()
