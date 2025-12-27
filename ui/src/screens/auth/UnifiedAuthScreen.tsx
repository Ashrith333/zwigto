import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services';

export const UnifiedAuthScreen: React.FC = () => {
  const navigation = useNavigation();
  const [phone, setPhone] = useState('+91');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone-password' | 'otp'>('phone-password');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter phone number and password');
      return;
    }

    // Ensure phone starts with +
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    setLoading(true);
    try {
      if (step === 'phone-password') {
        // First attempt: try to login or request OTP
        const response = await authService.unifiedAuth({
          phone: formattedPhone,
          password,
        });

        // If OTP is required (new user or user without password)
        if (response.requiresOtp) {
          setStep('otp');
          Alert.alert('OTP Sent', 'Please enter the OTP sent to your phone');
        } else if (response.accessToken) {
          // Login successful (existing user with password)
          // Check if user has a default role set
          if (response.user?.default_role) {
            // Navigate directly to default role's home screen
            if (response.user.default_role === 'USER') {
              (navigation as any).navigate('UserHome');
            } else if (response.user.default_role === 'RESTAURANT') {
              (navigation as any).navigate('RestaurantHome');
            } else if (response.user.default_role === 'ADMIN') {
              (navigation as any).navigate('AdminHome');
            } else {
              (navigation as any).navigate('RoleSelection');
            }
          } else {
            // No default role set, show role selection
            (navigation as any).navigate('RoleSelection');
          }
        }
      } else {
        // Second step: verify OTP and complete signup/login
        const response = await authService.unifiedAuth({
          phone: formattedPhone,
          password,
          otp,
        });

        if (response.accessToken) {
          Alert.alert('Success', 'Account created and logged in successfully!');
          // Check if user has a default role set (for existing users who just set password)
          if (response.user?.default_role) {
            // Navigate directly to default role's home screen
            if (response.user.default_role === 'USER') {
              (navigation as any).navigate('UserHome');
            } else if (response.user.default_role === 'RESTAURANT') {
              (navigation as any).navigate('RestaurantHome');
            } else if (response.user.default_role === 'ADMIN') {
              (navigation as any).navigate('AdminHome');
            } else {
              (navigation as any).navigate('RoleSelection');
            }
          } else {
            // New users should see role selection
            (navigation as any).navigate('RoleSelection');
          }
        }
      }
    } catch (error) {
      Alert.alert(
        step === 'phone-password' ? 'Authentication Failed' : 'OTP Verification Failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep('phone-password');
    setOtp('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {step === 'phone-password' ? 'Sign In / Sign Up' : 'Verify OTP'}
      </Text>

      {step === 'phone-password' ? (
        <>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+91XXXXXXXXXX"
            value={phone}
            onChangeText={(text) => {
              // Auto-add +91 if user starts typing without it
              if (text.length > 0 && !text.startsWith('+')) {
                setPhone(`+91${text}`);
              } else {
                setPhone(text);
              }
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            returnKeyType="next"
            blurOnSubmit={true}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            blurOnSubmit={true}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Checking...' : 'Continue'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            If you have an account, we'll sign you in. If not, we'll send an OTP to create your account.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.label}>Enter OTP sent to {phone}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="done"
            blurOnSubmit={true}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, (loading || !otp) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !otp}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBackToPhone} style={styles.linkButton}>
            <Text style={styles.linkText}>Change phone number</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
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
  hint: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

