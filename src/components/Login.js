import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Assuming the CSS is saved in App.css

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!username) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setAuthError('');
    } else {
      if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('isAuthenticated', 'true');
        onLogin();
        navigate('/');
      } else {
        setAuthError('Invalid username or password');
      }
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div>        <h2>Login</h2>
        </div>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
         
        
        </div>
        {errors.username && <div className="error">{errors.username}</div>}
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
           
        </div>
        {errors.password && <div className="error">{errors.password}</div>}
           {authError && <div className="error">{authError}</div>}
       <div className='login-button'>  <button  type="submit">Login</button></div>
      
      </form>
    </div>
  );
};

export default Login;
