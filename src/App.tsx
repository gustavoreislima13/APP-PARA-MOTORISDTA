/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './views/Home';
import DriverDashboard from './views/DriverDashboard';
import PassengerApp from './views/PassengerApp';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<DriverDashboard />} />
        <Route path="/reservar/:driverId" element={<PassengerApp />} />
      </Routes>
    </Router>
  );
}
