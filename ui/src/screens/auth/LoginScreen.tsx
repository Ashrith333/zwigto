import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { authService } from '../../services';
import { LoginRequest } from '../../../shared/api-contracts';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateToSignup: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onNavigateToSignup,
}) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter phone and password');
      return;
    }

    setLoading(true);
    try {
      const request: LoginRequest = { phone, password };
      await authService.login(request);
      onLoginSuccess();
    } catch (error) {
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        returnKeyType="next"
        blurOnSubmit={true}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        returnKeyType="done"
        blurOnSubmit={true}
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNavigateToSignup}>
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
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

