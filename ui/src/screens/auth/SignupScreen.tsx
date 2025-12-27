import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { authService } from '../../services';
import { SendOtpRequest, VerifyOtpRequest } from '../../../shared/api-contracts';

interface SignupScreenProps {
  onSignupSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({
  onSignupSuccess,
  onNavigateToLogin,
}) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    setLoading(true);
    try {
      const request: SendOtpRequest = { phone };
      await authService.sendOtp(request);
      setStep('otp');
      Alert.alert('Success', 'OTP sent to your phone');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    setLoading(true);
    try {
      const request: VerifyOtpRequest = { phone, otp };
      await authService.verifyOtp(request);
      onSignupSuccess();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      {step === 'phone' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="done"
            blurOnSubmit={true}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>Enter OTP sent to {phone}</Text>
          <TextInput
            style={styles.input}
            placeholder="OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            returnKeyType="done"
            blurOnSubmit={true}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('phone')}>
            <Text style={styles.linkText}>Change phone number</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity onPress={onNavigateToLogin}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    marginBottom: 10,
    fontSize: 14,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#007AFF',
  },
});

