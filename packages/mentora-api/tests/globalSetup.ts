/**
 * Global setup for integration tests
 * Automatically starts Firebase Emulator and Dev Server with proper environment
 */
import { spawn, execSync, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..', '..');
const firebaseDir = join(rootDir, 'packages', 'firebase');
const appDir = join(rootDir, 'apps', 'mentora');

let firebaseProcess: ChildProcess | null = null;
let devServerProcess: ChildProcess | null = null;
let wasEmulatorAlreadyRunning = false;
let wasDevServerAlreadyRunning = false;

const EMULATOR_PORT = 8080;
const AUTH_PORT = 9099;
const DEV_SERVER_PORT = 5173;

function isPortInUse(port: number): boolean {
	try {
		const result = execSync(`lsof -i :${port} -t 2>/dev/null || true`, { encoding: 'utf-8' });
		return result.trim().length > 0;
	} catch {
		return false;
	}
}

function waitForPort(port: number, timeout = 60000): Promise<boolean> {
	return new Promise((resolve) => {
		const startTime = Date.now();
		const check = () => {
			if (isPortInUse(port)) {
				resolve(true);
			} else if (Date.now() - startTime > timeout) {
				resolve(false);
			} else {
				setTimeout(check, 500);
			}
		};
		check();
	});
}

function killProcessOnPort(port: number): void {
	try {
		const pids = execSync(`lsof -i :${port} -t 2>/dev/null || true`, { encoding: 'utf-8' }).trim();
		if (pids) {
			for (const pid of pids.split('\n')) {
				if (pid) {
					try {
						execSync(`kill -9 ${pid} 2>/dev/null || true`);
					} catch {
						/* ignore */
					}
				}
			}
		}
	} catch {
		/* ignore */
	}
}

export async function setup() {
	console.log('\n🧪 Integration Test Setup\n');

	// Set Java home for Firebase Emulator
	const javaHome = process.env.JAVA_HOME || '/opt/homebrew/opt/openjdk@17';
	process.env.JAVA_HOME = javaHome;
	process.env.PATH = `${javaHome}/bin:${process.env.PATH}`;

	// Check if services are already running
	wasEmulatorAlreadyRunning = isPortInUse(EMULATOR_PORT);
	wasDevServerAlreadyRunning = isPortInUse(DEV_SERVER_PORT);

	// Start Firebase Emulator if not running
	if (!wasEmulatorAlreadyRunning) {
		console.log('📦 Starting Firebase Emulator...');

		firebaseProcess = spawn(
			'firebase',
			['emulators:start', '--only', 'auth,firestore', '--project', 'mentora-test'],
			{
				cwd: firebaseDir,
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {
					...process.env,
					JAVA_HOME: javaHome
				},
				detached: false
			}
		);

		// Log emulator output for debugging
		firebaseProcess.stdout?.on('data', (data) => {
			const msg = data.toString();
			if (msg.includes('All emulators ready')) {
				console.log('✓ Firebase Emulator ready');
			}
		});

		firebaseProcess.stderr?.on('data', (data) => {
			const msg = data.toString();
			if (msg.includes('Error') || msg.includes('FATAL')) {
				console.error('[Firebase Error]', msg);
			}
		});

		const emulatorReady = await waitForPort(EMULATOR_PORT);
		if (!emulatorReady) {
			throw new Error('Firebase Emulator failed to start within timeout');
		}

		// Wait for auth emulator too
		await waitForPort(AUTH_PORT, 30000);
		console.log('✓ Firebase Emulator ready');
	} else {
		console.log('✓ Firebase Emulator already running');
	}

	// Start Dev Server if not running
	if (!wasDevServerAlreadyRunning) {
		console.log('🚀 Starting Dev Server...');

		devServerProcess = spawn('pnpm', ['dev'], {
			cwd: appDir,
			stdio: ['pipe', 'pipe', 'pipe'],
			env: {
				...process.env,
				FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${AUTH_PORT}`,
				FIRESTORE_EMULATOR_HOST: `127.0.0.1:${EMULATOR_PORT}`
			},
			detached: false
		});

		devServerProcess.stdout?.on('data', (data) => {
			const msg = data.toString();
			if (msg.includes('ready in')) {
				console.log('✓ Dev Server ready');
			}
		});

		devServerProcess.stderr?.on('data', (data) => {
			const msg = data.toString();
			if (msg.includes('Error') && !msg.includes('API Error')) {
				console.error('[Dev Server Error]', msg);
			}
		});

		const devServerReady = await waitForPort(DEV_SERVER_PORT);
		if (!devServerReady) {
			throw new Error('Dev Server failed to start within timeout');
		}
		console.log('✓ Dev Server ready');
	} else {
		console.log('✓ Dev Server already running');
	}

	// Small delay to ensure everything is stable
	await new Promise((resolve) => setTimeout(resolve, 1000));

	console.log('\n🧪 Running Tests...\n');
}

export async function teardown() {
	console.log('\n🧹 Cleaning up...');

	// Only kill processes we started
	if (devServerProcess && !wasDevServerAlreadyRunning) {
		try {
			devServerProcess.kill('SIGTERM');
		} catch {
			/* ignore */
		}
	}

	if (firebaseProcess && !wasEmulatorAlreadyRunning) {
		try {
			firebaseProcess.kill('SIGTERM');
			// Give it time to cleanup
			await new Promise((resolve) => setTimeout(resolve, 2000));
		} catch {
			/* ignore */
		}
	}

	console.log('✓ Cleanup complete\n');
}
