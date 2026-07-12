import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Card, Brand, PrimaryButton, Alert, OtpInput } from '../components/UI';

export default function Verify2FA() {
  /*
  // 2FA is currently unused in this project.
  const navigate = useNavigate();
  const { saveSession } = useAuth();

  const [otp, setOtp]         = useState('');
  const [alert, setAlert]     = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) return setAlert({ type: 'error', msg: 'Enter all 6 digits.' });
    setAlert(null);
    setLoading(true);
    try {
      const res = await authAPI.authenticate2FA(otp);
      if (res.data.success) {
        saveSession(res.data.token, res.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setOtp('');
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Invalid code. Try again.' });
    }
    setLoading(false);
  };
  */

  return null;
}
