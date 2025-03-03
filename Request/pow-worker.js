// Web Worker for DeepSeek PoW computation
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function solveDeepSeekHashV1(challenge) {
    const {
        algorithm,
        challenge: targetHash,
        salt,
        signature,
        difficulty,
        expire_at,
        expire_after,
        target_path
    } = challenge;

    if (algorithm !== 'DeepSeekHashV1') {
        throw new Error('Unsupported algorithm');
    }

    // Check if challenge has expired
    if (Date.now() > expire_at) {
        throw new Error('Challenge has expired');
    }

    let nonce = 0;
    const maxNonce = Number.MAX_SAFE_INTEGER;
    const target = BigInt('0x' + '0'.repeat(difficulty));

    while (nonce < maxNonce) {
        const input = `${salt}${nonce}`;
        const hash = await sha256(input);
        const hashValue = BigInt('0x' + hash);

        if (hashValue < target) {
            // Verify the solution
            const solution = {
                nonce: nonce.toString(),
                hash,
                salt,
                signature
            };

            return solution;
        }

        nonce++;

        // Check for expiration every 1000 iterations
        if (nonce % 1000 === 0 && Date.now() > expire_at) {
            throw new Error('Challenge expired during computation');
        }
    }

    throw new Error('Failed to find solution within nonce range');
}

// Listen for messages from the main thread
self.onmessage = async function(e) {
    try {
        const solution = await solveDeepSeekHashV1(e.data);
        self.postMessage({ solution });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
}; 