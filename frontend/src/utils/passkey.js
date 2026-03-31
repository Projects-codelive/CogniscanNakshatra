const generateRandomString = (length) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const createPasskey = async (email) => {
  try {
    const challenge = generateRandomString(32);
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: Uint8Array.from(challenge, (c) => c.charCodeAt(0)),
        rp: {
          name: 'Nakshatra',
          id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
        },
        user: {
          id: Uint8Array.from(email, (c) => c.charCodeAt(0)),
          name: email,
          displayName: email.split('@')[0],
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    if (!credential) {
      throw new Error('Failed to create passkey');
    }

    const credentialData = {
      credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      publicKey: credential.publicKey ? btoa(JSON.stringify({
        crv: 'P-256',
        kty: 'EC',
        x: btoa(String.fromCharCode(...new Uint8Array(credential.publicKey.get('x')?.buffer || []))).slice(0, 43),
        y: btoa(String.fromCharCode(...new Uint8Array(credential.publicKey.get('y')?.buffer || []))).slice(0, 43),
      })) : null,
      counter: 0,
      createdAt: new Date().toISOString(),
    };

    return credentialData;
  } catch (error) {
    console.error('Error creating passkey:', error);
    throw error;
  }
};

export const authenticateWithPasskey = async (email) => {
  try {
    const storedUser = localStorage.getItem(`nakshatra-user-${email}`);
    if (!storedUser) {
      throw new Error('No user found with this email');
    }

    const userData = JSON.parse(storedUser);
    if (!userData.passkeyCredentialId) {
      throw new Error('No passkey registered for this user');
    }

    const challenge = generateRandomString(32);
    const credentialId = Uint8Array.from(atob(userData.passkeyCredentialId), (c) => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: Uint8Array.from(challenge, (c) => c.charCodeAt(0)),
        allowCredentials: [
          {
            id: credentialId,
            type: 'public-key',
          },
        ],
        userVerification: 'preferred',
        timeout: 60000,
      },
    });

    if (!assertion) {
      throw new Error('Authentication failed');
    }

    return true;
  } catch (error) {
    console.error('Error authenticating with passkey:', error);
    throw error;
  }
};

export const deletePasskey = (email) => {
  const storedUser = localStorage.getItem(`nakshatra-user-${email}`);
  if (storedUser) {
    const userData = JSON.parse(storedUser);
    delete userData.passkeyCredentialId;
    delete userData.passkeyPublicKey;
    delete userData.passkeyCounter;
    localStorage.setItem(`nakshatra-user-${email}`, JSON.stringify(userData));
  }
};

export const hasPasskey = (email) => {
  const storedUser = localStorage.getItem(`nakshatra-user-${email}`);
  if (!storedUser) return false;
  const userData = JSON.parse(storedUser);
  return !!userData.passkeyCredentialId;
};

export const isPasskeySupported = () => {
  return !!(
    navigator.credentials &&
    navigator.credentials.create &&
    navigator.credentials.get &&
    window.PublicKeyCredential
  );
};
