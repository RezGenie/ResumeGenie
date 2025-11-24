import subprocess
import sys
import os

def run_command(command, continue_on_error=False):
    try:
        print(f"Running: {command}")
        subprocess.check_call(command, shell=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        if not continue_on_error:
            sys.exit(1)

def main():
    # 1. Run migrations
    print("Running database migrations...")
    run_command("alembic upgrade head")

    # 2. Fix missing columns
    print("Fixing missing columns (if needed)...")
    run_command("python fix_embedding_column.py", continue_on_error=True)

    # 3. Auto ingest jobs
    print("Checking for jobs and running initial ingestion if needed...")
    run_command("python auto_ingest_jobs.py", continue_on_error=True)

    # 4. Start application
    print("Starting application...")
    # We use os.execvp to replace the current process with uvicorn, similar to 'exec' in bash
    # This ensures signals are passed correctly to the application
    os.execvp("uvicorn", ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"])

if __name__ == "__main__":
    main()
