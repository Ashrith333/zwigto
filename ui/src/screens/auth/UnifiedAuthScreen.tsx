import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services';

export const UnifiedAuthScreen: React.FC = () => {
  const navigation = useNavigation();
  const [phone, setPhone] = useState('+91');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone-password' | 'otp' | 'forgot-password'>('phone-password');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
            onPress={() => setShowForgotPassword(true)}
            style={styles.forgotPasswordLink}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

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

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </View>
  );
};

// Forgot Password Modal Component
const ForgotPasswordModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'password'>('phone');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    setLoading(true);
    try {
      await authService.requestPasswordReset(formattedPhone);
      Alert.alert('Success', 'OTP sent to your phone number');
      setStep('otp');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    setLoading(true);
    try {
      await authService.resetPassword(formattedPhone, otp, newPassword);
      Alert.alert('Success', 'Password reset successfully! Please login with your new password.', [
        { text: 'OK', onPress: onClose },
      ]);
      // Reset form
      setPhone('+91');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('phone');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPhone('+91');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('phone');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Reset Password</Text>

          {step === 'phone' && (
            <>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+91XXXXXXXXXX"
                value={phone}
                onChangeText={(text) => {
                  if (text.length > 0 && !text.startsWith('+')) {
                    setPhone(`+91${text}`);
                  } else {
                    setPhone(text);
                  }
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRequestOtp}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.label}>Enter OTP sent to {phone}</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, (loading || !otp) && styles.buttonDisabled]}
                onPress={() => {
                  if (otp.length === 6) {
                    setStep('password');
                  } else {
                    Alert.alert('Error', 'Please enter a valid 6-digit OTP');
                  }
                }}
                disabled={loading || !otp}
              >
                <Text style={styles.buttonText}>Verify OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.linkButton}>
                <Text style={styles.linkText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'password' && (
            <>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.button, (loading || !newPassword || !confirmPassword) && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading || !newPassword || !confirmPassword}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('otp')} style={styles.linkButton}>
                <Text style={styles.linkText}>Back to OTP</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  cancelButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

