import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from './firebase/firebase_config';
import { logInWithEmailAndPassword } from './firebase/auth';
import { useAuthState } from "react-firebase-hooks/auth";
import "./Login.css";
import { FaEyeSlash, FaEye } from 'react-icons/fa';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [user, loading, error] = useAuthState(auth);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) navigate("/playerManager");
  }, [user, loading, navigate]);

  const validate = () => {
    let errors = {};
    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email address is invalid";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      try {
        await logInWithEmailAndPassword(email, password);
      } catch (err) {
        console.error("Error during login:", err);
        alert("Login failed. Please check your credentials and try again.");
      }
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        <div className="form-group label" >
          <label htmlFor="email">Email:</label>
          <input
            type="text"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {errors.email && <span className="error">{errors.email}</span>}
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <div className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="toggle-password" onClick={toggleShowPassword}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
        </div>
        {errors.password && <span className="error">{errors.password}</span>}
        <div className="login-button">
          <button type="submit">Login</button>
        </div>
      </form>
    </div>
  );
}

export default Login;
