import subprocess
import time
import sys
import os
import signal


def run():
    print("Starting server...")
    # Use shell=True for npm on windows
    server = subprocess.Popen("npm run dev", shell=True, cwd=os.getcwd())

    try:
        print("Waiting for server to start (10s)...")
        time.sleep(10)

        print("Running tests...")
        # Ensure python calls the right python
        cmd = [sys.executable, "tests/e2e/security_check.py"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        print("--- Test Output ---")
        print(result.stdout)
        print("--- Test Errors ---")
        print(result.stderr)
        print("-------------------")

        if result.returncode != 0:
            print("Tests FAILED")
            sys.exit(1)
        else:
            print("Tests PASSED")

    finally:
        print("Stopping server...")
        try:
            subprocess.run(f"taskkill /F /PID {server.pid} /T", shell=True)
        except Exception as e:
            print(f"Failed to kill server: {e}")


if __name__ == "__main__":
    run()
