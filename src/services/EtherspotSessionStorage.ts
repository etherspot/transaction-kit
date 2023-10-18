import { SessionStorage } from '@etherspot/prime-sdk';

class LocalSessionStorage extends SessionStorage {
  constructor () {
    super();
  }

  setSession = async (walletAddress: string, session: Object) => {
    if (walletAddress) {
      window.localStorage.setItem(`session-prime-${walletAddress}`, JSON.stringify(session))
    }
  }

  getSession = (walletAddress: string) => {
    let result = null;

    try {
      const raw = window.localStorage.getItem(`session-prime-${walletAddress}`);
      result = raw ? JSON.parse(raw) : null
    } catch (err) {
      //
    }

    return result
  }

  resetSession = (walletAddress: string) => {
    window.localStorage.setItem(`session-prime-${walletAddress}`, '');
  }
}

export const sessionStorageInstance = new LocalSessionStorage();
