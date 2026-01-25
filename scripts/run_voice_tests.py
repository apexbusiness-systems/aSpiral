import subprocess
import time
import sys
import os
import signal
import socket


def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


def main():
    print("Starting Dev Server...")
    log_file = open("e2e_test_output.log", "w")
    server_process = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", "5173"],
        shell=True,
        cwd=os.getcwd(),
        stdout=log_file,
        stderr=log_file,
    )

    try:
        # Wait for server to be ready
        print("Waiting for server on port 5173...")
        attempts = 0
        while not is_port_open(5173):
            time.sleep(1)
            attempts += 1
            if attempts > 30:
                print("Server failed to start in 30s")
                raise TimeoutError("Server timeout")

        print("Server is ready!")

        # Run Tests
        print("Running Playwright Tests...")
        test_cmd = [sys.executable, "tests/e2e/voice_system_test.py"]
        test_result = subprocess.run(test_cmd, capture_output=True, text=True)

        with open("e2e_test_result.log", "w") as f:
            f.write(test_result.stdout)
            f.write("\nSTDERR:\n")
            f.write(test_result.stderr)

        print("Test Output written to e2e_test_result.log")

        if test_result.returncode != 0:
            print("Tests FAILED")
            sys.exit(1)

        print("Tests PASSED")

    finally:
        print("Stopping Server...")
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(server_process.pid)],
            capture_output=True,
        )
        log_file.close()


if __name__ == "__main__":
    main()
