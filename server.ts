import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { sequelize } from './src/db/connection';
import { User, Vehicle, Ride, Schedule, DailyLog, FinancialRecord, CityEvent, DemandRegion, CommunityPost, Journey, SmartPlanner, FuturePrediction, TaximeterRate, SimulatorRecord } from './src/db/models';
import { CostCalculatorService } from './src/services/CostCalculatorService';
import { GoogleMapsService } from './src/services/GoogleMapsService';
import { MailService } from './src/services/MailService';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Seed Database for Preview environment
  try {
    const fs = await import('fs');
    try {
      await sequelize.authenticate();
    } catch (authErr: any) {
      console.error('Database connection failed. Attempting to recover...', authErr);
      if (fs.existsSync('./drivermetrics.sqlite')) {
        try {
          fs.unlinkSync('./drivermetrics.sqlite');
          console.log('Deleted corrupted drivermetrics.sqlite database file.');
        } catch (unlinkErr) {
          console.error('Failed to delete corrupt sqlite file:', unlinkErr);
        }
      }
    }

    try {
      await sequelize.sync({ alter: true });
      console.log('Database synced successfully via alter.');
    } catch (syncError: any) {
      console.error('Failed to sync DB with alter. Attempting clean recreate...', syncError.message || syncError);
      if (fs.existsSync('./drivermetrics.sqlite')) {
        try {
          fs.unlinkSync('./drivermetrics.sqlite');
          console.log('Deleted drivermetrics.sqlite database file for clean recovery.');
        } catch (unlinkErr) {
          console.error('Failed to delete sqlite file during recovery:', unlinkErr);
        }
      }
      try {
        await sequelize.sync({ force: true });
        console.log('Database clean synced successfully.');
      } catch (forceError: any) {
        console.error('Clean sync failed:', forceError.message || forceError);
      }
    }
    
    // Enable Write-Ahead Logging (WAL) for SQLite to prevent future corruption
    try {
      await sequelize.query('PRAGMA journal_mode=WAL;');
      console.log('SQLite Write-Ahead Logging (WAL) enabled.');
    } catch (pragmaErr) {
      console.error('Failed to set WAL pragma:', pragmaErr);
    }
    console.log('Database synced.');
    
    let testUser = await User.findOne({ where: { email: 'joao@drivermetrics.pro' } });
    if (!testUser) {
      const existingWithUrl = await User.findOne({ where: { custom_url: 'joao' } });
      testUser = await User.create({
        role: 'driver',
        name: 'João Motorista',
        email: 'joao@drivermetrics.pro',
        phone: '+5511999999999',
        pix_key: 'joao@pix.com',
        custom_url: existingWithUrl ? `joao-${Date.now()}` : 'joao',
      });
    }

    let testVehicle = await Vehicle.findOne({ where: { driver_id: testUser.id } });
    if (!testVehicle) {
      await Vehicle.create({
        driver_id: testUser.id,
        make: 'VW',
        model: 'Fox 1.0',
        year: 2014,
        color: 'Preto',
        ownership_status: 'paid_off',
        average_consumption_km_l: 12.5,
        fixed_monthly_cost: 450.00,
        monthly_km_goal: 3000,
      });
      console.log('Preview data and vehicle seeded.');
    }

    // Seed City Events
    const eventsCount = await CityEvent.count();
    if (eventsCount === 0) {
      await CityEvent.bulkCreate([
        {
          title: 'Camp de férias de Julho/26 - Appito Jr - Alphaville',
          date: '2026-07-21',
          location: 'Alphaville, Barueri - SP',
          description: 'Torneio infantil de futebol. Grande fluxo de famílias de alta renda necessitando transporte na região à tarde.',
          is_premium: true,
        },
        {
          title: 'Show Allianz Parque - Cold Play Replay',
          date: '2026-07-22',
          location: 'Allianz Parque, Pompeia - SP',
          description: 'Abertura dos portões às 16h. Estimativa de 45 mil pessoas. Tarifa dinâmica alta esperada entre 16h e 23h.',
          is_premium: true,
        },
        {
          title: 'Festa de Formatura USP',
          date: '2026-07-24',
          location: 'Espaço das Américas, Barra Funda - SP',
          description: 'Grande movimentação de passageiros na madrugada das 02h às 06h da manhã.',
          is_premium: true,
        }
      ]);
      console.log('Seeded City Events.');
    }

    // Seed Demand Regions
    const regionsCount = await DemandRegion.count();
    if (regionsCount === 0) {
      await DemandRegion.bulkCreate([
        {
          name: 'Av. Getúlio Vargas / Centro comercial',
          address: 'Av. Getúlio Vargas, Barueri - SP',
          demand_level: 'high',
          best_hours: '11:00 - 14:00, 17:00 - 19:30',
          is_premium: true,
        },
        {
          name: 'Aeroporto de Congonhas (Saguão de Desembarque)',
          address: 'Av. Washington Luís, s/n - Vila Congonhas, São Paulo - SP',
          demand_level: 'high',
          best_hours: '06:00 - 10:00, 18:00 - 22:00',
          is_premium: true,
        },
        {
          name: 'Vila Olímpia / Centro Financeiro',
          address: 'Rua Funchal, São Paulo - SP',
          demand_level: 'high',
          best_hours: '08:00 - 10:30, 17:30 - 20:00',
          is_premium: true,
        },
        {
          name: 'Av. Paulista / Consolação',
          address: 'Av. Paulista, 2000, São Paulo - SP',
          demand_level: 'high',
          best_hours: '12:00 - 14:00, 18:00 - 21:00',
          is_premium: true,
        }
      ]);
      console.log('Seeded Demand Regions.');
    }

    // Seed Community Posts
    const postsCount = await CommunityPost.count();
    if (postsCount === 0 && testUser) {
      await CommunityPost.bulkCreate([
        {
          driver_id: testUser.id,
          author_name: 'Marcos Uber Gold',
          content: 'Etanol a R$ 3,89 no Posto Shell da Av. dos Autonomistas em Osasco! Filas pequenas agora.',
          likes: 12,
          comments_count: 3,
        },
        {
          driver_id: testUser.id,
          author_name: 'Sandro Premium',
          content: 'Cuidado pessoal, Av. das Nações Unidas com trânsito travado por causa de uma colisão perto do Shopping Eldorado. Evitem pegar chamadas lá.',
          likes: 8,
          comments_count: 2,
        },
        {
          driver_id: testUser.id,
          author_name: 'Renata 99Plus',
          content: 'Aeroporto de Guarulhos hoje à noite está com tarifa dinâmica de 2.0x! Vale a pena subir pra quem está na Zona Leste.',
          likes: 24,
          comments_count: 7,
        }
      ]);
      console.log('Seeded Community Posts.');
    }

    // Seed Smart Planners
    const plannersCount = await SmartPlanner.count();
    if (plannersCount === 0 && testUser) {
      await SmartPlanner.bulkCreate([
        {
          driver_id: testUser.id,
          day_of_week: 'Segunda-feira',
          shift: 'morning',
          recommended_action: 'Rodar na região de Pinheiros / Jardins das 07:00 às 10:00. Foco em viagens curtas de alta tarifa para corporativos.',
          expected_revenue: 120.00,
        },
        {
          driver_id: testUser.id,
          day_of_week: 'Terça-feira',
          shift: 'afternoon',
          recommended_action: 'Focar na região da Berrini / Vila Olímpia entre 17:00 e 20:00. Alta movimentação de saída de escritórios.',
          expected_revenue: 140.00,
        }
      ]);
      console.log('Seeded Smart Planners.');
    }
  } catch (error) {
    console.error('Failed to sync DB:', error);
  }

  // --- API Routes --- //

  // Secure Server-side Proxy for Google Maps Distance Matrix API
  app.post('/api/maps/distancematrix', async (req, res) => {
    try {
      const { origin, destination, stops = [] } = req.body;
      if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination are required' });
      }

      const metrics = await GoogleMapsService.calculateRouteMetrics(origin, destination, stops);
      res.json(metrics);
    } catch (error: any) {
      console.error('[Proxy Error]', error.message);
      res.status(500).json({ error: error.message || 'Error fetching distance matrix' });
    }
  });

  // Simulate Ride (Passenger App)
  app.post('/api/simulate', async (req, res) => {
    try {
      const { origin, destination, driverId } = req.body;
      
      const driver = await User.findOne({ where: { custom_url: driverId, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const vehicle = await Vehicle.findOne({ where: { driver_id: driver.id } });
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

      // Fetch Real Distance/Time using Google Maps (Preferred) or Nominatim + OSRM (Fallback)
      let distanceKm = req.body.distanceKm ? Number(req.body.distanceKm) : 0;
      let timeMins = req.body.timeMins ? Number(req.body.timeMins) : 0;
      
      if (!distanceKm || !timeMins) {
        try {
          let usedGoogleMaps = false;
          if (process.env.GOOGLE_MAPS_PLATFORM_KEY && process.env.GOOGLE_MAPS_PLATFORM_KEY !== 'YOUR_API_KEY_HERE') {
            try {
              const metrics = await GoogleMapsService.calculateRouteMetrics(
                req.body.origin,
                req.body.destination,
                req.body.stops || []
              );
              distanceKm = metrics.distanceKm;
              timeMins = metrics.timeMins;
              usedGoogleMaps = true;
            } catch (err: any) {
              console.log(`[INFO] Google Maps failed. Using OSRM fallback.`);
            }
          } 
          
          if (!usedGoogleMaps) {
            const waypoints = [req.body.origin, ...(req.body.stops || []), req.body.destination].filter(Boolean);
            const coords = [];
            for (const wp of waypoints) {
              let lon, lat;
              try {
                let searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(wp)}&format=json&limit=1&countrycodes=br`;
                let res = await fetch(searchUrl, {
                  headers: { 'User-Agent': 'DriverMetricsApp/1.0 (reisanselmo7@gmail.com)' }
                });
                let data = await res.json();
                
                if (!data || data.length === 0) {
                  const wpCleaned = wp.replace(/,\s*\d+.*$/, '').replace(/\s+\d+\s*$/, '').trim();
                  if (wpCleaned && wpCleaned !== wp) {
                    const retryUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(wpCleaned)}&format=json&limit=1&countrycodes=br`;
                    res = await fetch(retryUrl, {
                      headers: { 'User-Agent': 'DriverMetricsApp/1.0 (reisanselmo7@gmail.com)' }
                    });
                    data = await res.json();
                  }
                }

                if (data && data.length > 0) {
                  lon = data[0].lon;
                  lat = data[0].lat;
                }
              } catch (err) {
                console.warn(`[WARN] Nominatim geocode failed for "${wp}":`, err);
              }

              if (lon && lat) {
                coords.push(`${lon},${lat}`);
              } else {
                // Generate deterministic coordinate mapping based on string value so it remains stable
                let hash = 0;
                for (let i = 0; i < wp.length; i++) {
                  hash = wp.charCodeAt(i) + ((hash << 5) - hash);
                }
                const fakeLat = -23.5505 + (Math.sin(hash) * 0.1);
                const fakeLon = -46.6333 + (Math.cos(hash) * 0.1);
                coords.push(`${fakeLon},${fakeLat}`);
                console.log(`[INFO] Address "${wp}" fallback geocode used.`);
              }
            }
            
            if (coords.length >= 2) {
              let osrmSuccess = false;
              try {
                const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords.join(';')}?overview=false`);
                const osrmData = await osrmRes.json();
                if (osrmData.routes && osrmData.routes.length > 0) {
                  distanceKm = osrmData.routes[0].distance / 1000;
                  timeMins = osrmData.routes[0].duration / 60;
                  osrmSuccess = true;
                }
              } catch (osrmErr) {
                console.warn("[WARN] OSRM routing failed:", osrmErr);
              }

              if (!osrmSuccess) {
                // Generate highly stable, realistic deterministic route based on address text length/content
                let hash = 0;
                const combined = req.body.origin + req.body.destination;
                for (let i = 0; i < combined.length; i++) {
                  hash = combined.charCodeAt(i) + ((hash << 5) - hash);
                }
                const seed = Math.abs(hash);
                distanceKm = 5 + (seed % 301) / 10; // 5.0 to 35.0 km
                timeMins = (distanceKm / 40) * 60 + (seed % 15); // Avg 40 km/h plus some signal wait
                console.log(`[INFO] Route calculation fallback used. Distance: ${distanceKm} km, Time: ${timeMins} mins.`);
              }
            }
          }
        } catch (err: any) {
          console.error('[ERROR] Unexpected routing error:', err);
        }

        // Final sanity fallback in case everything is zero
        if (!distanceKm || distanceKm <= 0) {
          distanceKm = 12.4;
          timeMins = 22;
        }
      }

      // Calculate offered price based on driver's desired hourly rate and cost per km
      const fuelPrice = 5.50; // Mock current fuel price
      const costs = CostCalculatorService.calculateRideCost(vehicle, distanceKm, timeMins, fuelPrice);
      
      const desiredHourlyRate = driver.desired_hourly_rate ? Number(driver.desired_hourly_rate) : 30;
      const desiredProfitPerHourAmount = (desiredHourlyRate / 60) * timeMins;
      
      const desiredProfitPerKm = driver.desired_profit_per_km ? Number(driver.desired_profit_per_km) : 0.50;
      const desiredProfitPerKmAmount = desiredProfitPerKm * distanceKm;
      
      // Use whichever is higher to guarantee the driver's goals are met
      const desiredProfit = Math.max(desiredProfitPerHourAmount, desiredProfitPerKmAmount);
      
      const offeredPrice = costs.totalCost + desiredProfit;

      const profitability = CostCalculatorService.evaluateRideProfitability(
        vehicle, 
        distanceKm, 
        timeMins, 
        offeredPrice, 
        fuelPrice
      );

      res.json({ 
        price: offeredPrice, 
        distanceKm: distanceKm.toFixed(1), 
        timeMins: timeMins.toFixed(0), 
        profitability,
        driverEmail: driver.email,
        driverName: driver.name
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Simulation failed' });
    }
  });

  // Send Email (Proxy for Gmail API)
  app.post('/api/send-email', async (req, res) => {
    try {
      const { token, rawEmail } = req.body;
      if (!token || !rawEmail) {
        return res.status(400).json({ error: 'Missing token or rawEmail' });
      }

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawEmail })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gmail API Error Response:', errorText);
        return res.status(response.status).json({ error: `Gmail API error: ${errorText}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Failed to send email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Book Ride
  app.post('/api/book', async (req, res) => {
    try {
      const { origin, destination, stops, scheduledDate, scheduledTime, distanceKm, timeMins, price, netProfit, driverId, passengerName, passengerEmail, passengerPhone } = req.body;
      
      const driver = await User.findOne({ where: { custom_url: driverId, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      let passengerUser = null;
      if (passengerEmail) {
        const normalizedPassengerEmail = passengerEmail.trim().toLowerCase();
        passengerUser = await User.findOne({ where: { email: normalizedPassengerEmail } });
        if (!passengerUser) {
          passengerUser = await User.create({
            role: 'passenger',
            name: passengerName || 'Passageiro',
            email: normalizedPassengerEmail,
            phone: passengerPhone || null
          });
        } else {
          if (passengerPhone && !passengerUser.phone) {
            passengerUser.phone = passengerPhone;
            await passengerUser.save();
          }
        }
      }

      let scheduled_time = null;
      if (scheduledDate && scheduledTime) {
        // e.g. "2023-10-05T14:30:00"
        scheduled_time = new Date(`${scheduledDate}T${scheduledTime}`);
      }

      const ride = await Ride.create({
        driver_id: driver.id,
        passenger_id: passengerUser ? passengerUser.id : null,
        passenger_name: passengerName || null,
        passenger_email: passengerEmail || null,
        passenger_phone: passengerPhone || null,
        origin,
        destination,
        stops: stops || [],
        distance_km: distanceKm,
        estimated_time_mins: timeMins,
        price,
        net_profit: netProfit,
        status: 'scheduled',
        scheduled_time
      });

      const startTime = scheduled_time || new Date();
      const endTime = new Date(startTime.getTime() + timeMins * 60000);

      await Schedule.create({
        driver_id: driver.id,
        ride_id: ride.id,
        start_time: startTime,
        end_time: endTime
      });

      // Send email notification to driver in background
      MailService.sendRideNotification(driver.email, {
        passengerName: passengerName || 'Desconhecido',
        passengerEmail: passengerEmail || 'Não informado',
        origin,
        stops: stops || [],
        destination,
        distanceKm,
        timeMins,
        price
      }).catch(err => console.error('Failed to send mail:', err));

      res.json({ success: true, ride });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Booking failed' });
    }
  });

  // Update Driver Profile
  app.post('/api/driver/profile', async (req, res) => {
    try {
      const { 
        firebase_uid, 
        email, 
        name, 
        custom_url, 
        monthly_km_goal, 
        desired_hourly_rate,
        desired_profit_per_km,
        average_consumption_km_l,
        maintenance_reserve_per_km,
        net_income_goal_monthly,
        work_days_per_month,
        car_payment_monthly,
        insurance_monthly,
        ipva_yearly,
        internet_monthly,
        tires_total,
        vehicle_make,
        vehicle_model,
        phone,
        pix_key,
        photo_url
      } = req.body;
      
      const normalizedEmail = email ? email.trim().toLowerCase() : null;
      const targetCustomUrl = custom_url ? custom_url.trim() : null;

      if (targetCustomUrl) {
        const existingWithUrl = await User.findOne({ where: { custom_url: targetCustomUrl } });
        if (existingWithUrl && existingWithUrl.firebase_uid !== firebase_uid) {
          return res.status(400).json({ error: 'Este link personalizado já está em uso por outro motorista.' });
        }
      }

      let driver = await User.findOne({ where: { firebase_uid } });
      if (!driver) {
        // Find by email if exists (first time login)
        driver = await User.findOne({ where: { email: normalizedEmail } });
        if (driver) {
          driver.firebase_uid = firebase_uid;
          if (phone !== undefined) driver.phone = phone;
          if (pix_key !== undefined) driver.pix_key = pix_key;
          if (photo_url !== undefined) driver.photo_url = photo_url;
          if (name !== undefined) driver.name = name;
          await driver.save();
        } else {
          driver = await User.create({
            role: 'driver',
            firebase_uid,
            email: normalizedEmail,
            name,
            phone: phone || null,
            pix_key: pix_key || null,
            photo_url: photo_url || null,
            custom_url: targetCustomUrl || firebase_uid.slice(0, 8),
            desired_hourly_rate,
            desired_profit_per_km,
            net_income_goal_monthly: net_income_goal_monthly || 5000,
            work_days_per_month: work_days_per_month || 22
          });
        }
      } else {
        if (custom_url !== undefined) driver.custom_url = targetCustomUrl || null;
        if (desired_hourly_rate !== undefined) driver.desired_hourly_rate = desired_hourly_rate;
        if (desired_profit_per_km !== undefined) driver.desired_profit_per_km = desired_profit_per_km;
        if (net_income_goal_monthly !== undefined) driver.net_income_goal_monthly = net_income_goal_monthly;
        if (work_days_per_month !== undefined) driver.work_days_per_month = work_days_per_month;
        if (phone !== undefined) driver.phone = phone;
        if (pix_key !== undefined) driver.pix_key = pix_key;
        if (photo_url !== undefined) driver.photo_url = photo_url;
        if (name !== undefined) driver.name = name;
        if (email !== undefined) driver.email = normalizedEmail || driver.email;
        await driver.save();
      }

      // Calculate new fixed cost dynamically
      const cp = Number(car_payment_monthly || 0);
      const ins = Number(insurance_monthly || 0);
      const ipva = Number(ipva_yearly || 0) / 12;
      const net = Number(internet_monthly || 0);
      const tires = Number(tires_total || 0) / 12; // amortizing yearly
      const calculated_fixed_monthly_cost = cp + ins + ipva + net + tires;

      let vehicle = await Vehicle.findOne({ where: { driver_id: driver.id, is_active: true } });
      if (!vehicle) {
        vehicle = await Vehicle.create({
          driver_id: driver.id,
          make: vehicle_make || 'Geral',
          model: vehicle_model || 'Carro',
          year: 2020,
          color: 'Preto',
          ownership_status: 'paid_off',
          average_consumption_km_l: average_consumption_km_l || 12.5,
          fixed_monthly_cost: calculated_fixed_monthly_cost > 0 ? calculated_fixed_monthly_cost : 450.00,
          monthly_km_goal: monthly_km_goal || 3000,
          maintenance_reserve_per_km: maintenance_reserve_per_km || 0.15,
          is_active: true,
          car_payment_monthly: cp,
          insurance_monthly: ins,
          ipva_yearly: ipva * 12,
          internet_monthly: net,
          tires_total: tires * 12
        });
      } else {
        if (vehicle_make !== undefined) vehicle.make = vehicle_make;
        if (vehicle_model !== undefined) vehicle.model = vehicle_model;
        if (monthly_km_goal !== undefined) vehicle.monthly_km_goal = monthly_km_goal;
        if (average_consumption_km_l !== undefined) vehicle.average_consumption_km_l = average_consumption_km_l;
        if (maintenance_reserve_per_km !== undefined) vehicle.maintenance_reserve_per_km = maintenance_reserve_per_km;
        
        if (car_payment_monthly !== undefined) vehicle.car_payment_monthly = cp;
        if (insurance_monthly !== undefined) vehicle.insurance_monthly = ins;
        if (ipva_yearly !== undefined) vehicle.ipva_yearly = ipva * 12;
        if (internet_monthly !== undefined) vehicle.internet_monthly = net;
        if (tires_total !== undefined) vehicle.tires_total = tires * 12;
        
        vehicle.fixed_monthly_cost = cp + ins + ipva + net + tires;
        
        await vehicle.save();
      }

      res.json({ success: true, driver, vehicle });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Accept Ride
  app.post('/api/rides/:id/accept', async (req, res) => {
    try {
      const ride = await Ride.findByPk(req.params.id);
      if (!ride) return res.status(404).json({ error: 'Ride not found' });
      
      ride.status = 'in_progress';
      await ride.save();
      
      res.json({ success: true, ride });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to accept ride' });
    }
  });

  // Cancel Ride
  app.post('/api/rides/:id/cancel', async (req, res) => {
    try {
      const ride = await Ride.findByPk(req.params.id);
      if (!ride) return res.status(404).json({ error: 'Ride not found' });
      
      ride.status = 'cancelled';
      await ride.save();
      
      res.json({ success: true, ride });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to cancel ride' });
    }
  });

  // Complete Ride
  app.post('/api/rides/:id/complete', async (req, res) => {
    try {
      const ride = await Ride.findByPk(req.params.id);
      if (!ride) return res.status(404).json({ error: 'Ride not found' });
      
      ride.status = 'completed';
      await ride.save();
      
      res.json({ success: true, ride });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to complete ride' });
    }
  });

  // Driver Dashboard Stats
  app.get('/api/dashboard/:uid', async (req, res) => {
    try {
      const driver = await User.findOne({ where: { firebase_uid: req.params.uid, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const vehicle = await Vehicle.findOne({ where: { driver_id: driver.id } });
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

      const rides = await Ride.findAll({ 
        where: { driver_id: driver.id },
        order: [['createdAt', 'DESC']]
      });

      const dailyLogs = await DailyLog.findAll({
        where: { driver_id: driver.id },
        order: [['date', 'DESC']]
      });

      const financialRecords = await FinancialRecord.findAll({
        where: { driver_id: driver.id },
        order: [['date', 'DESC']]
      });

      // Query new tables
      const cityEvents = await CityEvent.findAll({ order: [['date', 'ASC']] });
      const demandRegions = await DemandRegion.findAll({ order: [['demand_level', 'DESC']] });
      const communityPosts = await CommunityPost.findAll({ order: [['createdAt', 'DESC']] });
      const journeys = await Journey.findAll({ where: { driver_id: driver.id }, order: [['createdAt', 'DESC']] });
      const smartPlanners = await SmartPlanner.findAll({ where: { driver_id: driver.id } });
      const futurePredictions = await FuturePrediction.findAll({ where: { driver_id: driver.id }, order: [['target_date', 'ASC']] });
      const taximeterRates = await TaximeterRate.findAll({ where: { driver_id: driver.id } });
      const simulatorRecords = await SimulatorRecord.findAll({ where: { driver_id: driver.id }, order: [['createdAt', 'DESC']] });

      const totalRevenue = rides.reduce((sum, r) => sum + Number(r.price), 0);
      const totalProfit = rides.reduce((sum, r) => sum + Number(r.net_profit), 0);
      
      // Calculate current cost per KM based on vehicle
      const fixedCostPerKm = Number(vehicle.fixed_monthly_cost) / Number(vehicle.monthly_km_goal);
      const fuelCostPerKm = 5.50 / Number(vehicle.average_consumption_km_l);
      const costPerKm = fixedCostPerKm + fuelCostPerKm + Number(vehicle.maintenance_reserve_per_km || 0.15);

      res.json({
        costPerKm,
        totalRevenue,
        totalProfit,
        ridesCount: rides.length,
        rides,
        dailyLogs,
        financialRecords,
        vehicle,
        driver,
        cityEvents,
        demandRegions,
        communityPosts,
        journeys,
        smartPlanners,
        futurePredictions,
        taximeterRates,
        simulatorRecords
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // Get Public Driver Profile by Custom URL
  app.get('/api/driver/by-url/:customUrl', async (req, res) => {
    try {
      const driver = await User.findOne({ where: { custom_url: req.params.customUrl, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });
      
      const vehicle = await Vehicle.findOne({ where: { driver_id: driver.id } });
      
      res.json({
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        pix_key: driver.pix_key,
        photo_url: driver.photo_url,
        vehicle: vehicle ? {
          make: vehicle.make,
          model: vehicle.model,
          color: vehicle.color,
          year: vehicle.year
        } : null
      });
    } catch (error) {
      console.error('Error fetching public driver profile:', error);
      res.status(500).json({ error: 'Failed to fetch driver profile' });
    }
  });

  // Register Passenger / Client Profile on Login
  app.post('/api/passenger/register', async (req, res) => {
    try {
      const { firebase_uid, email, name, phone } = req.body;
      if (!firebase_uid || !email) {
        return res.status(400).json({ error: 'Firebase UID and email are required' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      let user = await User.findOne({ where: { firebase_uid } });
      if (!user) {
        // Find by email if exists (case-insensitive or normalized)
        user = await User.findOne({ where: { email: normalizedEmail } });
        if (user) {
          user.firebase_uid = firebase_uid;
          if (phone && !user.phone) user.phone = phone;
          if (name && !user.name) user.name = name;
          await user.save();
        } else {
          user = await User.create({
            role: 'passenger',
            firebase_uid,
            email: normalizedEmail,
            name: name || 'Passageiro',
            phone: phone || null
          });
        }
      } else {
        if (email && user.email !== normalizedEmail) {
          user.email = normalizedEmail;
        }
        if (name && !user.name) user.name = name;
        if (phone && !user.phone) user.phone = phone;
        await user.save();
      }

      res.json({ success: true, user });
    } catch (error: any) {
      console.error('Error registering passenger:', error);
      res.status(500).json({ error: 'Failed to register passenger: ' + error.message });
    }
  });

  // Create Daily Log
  app.post('/api/daily-logs', async (req, res) => {
    try {
      const { firebase_uid, date, earnings, km, hours_worked, notes } = req.body;
      const driver = await User.findOne({ where: { firebase_uid, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const log = await DailyLog.create({
        driver_id: driver.id,
        date,
        earnings: Number(earnings || 0),
        km: Number(km || 0),
        hours_worked: Number(hours_worked || 0),
        notes: notes || null
      });

      res.json({ success: true, log });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create daily log' });
    }
  });

  // Update Daily Log
  app.put('/api/daily-logs/:id', async (req, res) => {
    try {
      const log = await DailyLog.findByPk(req.params.id);
      if (!log) return res.status(404).json({ error: 'Daily log not found' });

      const { date, earnings, km, hours_worked, notes } = req.body;
      if (date !== undefined) log.date = date;
      if (earnings !== undefined) log.earnings = Number(earnings || 0);
      if (km !== undefined) log.km = Number(km || 0);
      if (hours_worked !== undefined) log.hours_worked = Number(hours_worked || 0);
      if (notes !== undefined) log.notes = notes || null;

      await log.save();
      res.json({ success: true, log });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update daily log' });
    }
  });

  // Delete Daily Log
  app.delete('/api/daily-logs/:id', async (req, res) => {
    try {
      const log = await DailyLog.findByPk(req.params.id);
      if (!log) return res.status(404).json({ error: 'Daily log not found' });

      await log.destroy();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete daily log' });
    }
  });

  // Create Financial Record
  app.post('/api/financial-records', async (req, res) => {
    try {
      const { firebase_uid, type, category, amount, description, date } = req.body;
      const driver = await User.findOne({ where: { firebase_uid, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const record = await FinancialRecord.create({
        driver_id: driver.id,
        type,
        category,
        amount: Number(amount),
        description: description || null,
        date: date ? new Date(date) : new Date()
      });

      res.json({ success: true, record });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create financial record' });
    }
  });

  // Update Financial Record
  app.put('/api/financial-records/:id', async (req, res) => {
    try {
      const record = await FinancialRecord.findByPk(req.params.id);
      if (!record) return res.status(404).json({ error: 'Financial record not found' });

      const { type, category, amount, description, date } = req.body;
      if (type !== undefined) record.type = type;
      if (category !== undefined) record.category = category;
      if (amount !== undefined) record.amount = Number(amount);
      if (description !== undefined) record.description = description || null;
      if (date !== undefined) record.date = date ? new Date(date) : record.date;

      await record.save();
      res.json({ success: true, record });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update financial record' });
    }
  });

  // Delete Financial Record
  app.delete('/api/financial-records/:id', async (req, res) => {
    try {
      const record = await FinancialRecord.findByPk(req.params.id);
      if (!record) return res.status(404).json({ error: 'Financial record not found' });

      await record.destroy();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete financial record' });
    }
  });

  // --- New Applet Operations & Strategies API Routes ---

  // Community Posts
  app.post('/api/community-posts', async (req, res) => {
    try {
      const { firebase_uid, content } = req.body;
      const driver = await User.findOne({ where: { firebase_uid, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const post = await CommunityPost.create({
        driver_id: driver.id,
        author_name: driver.name || 'Motorista Anônimo',
        content,
        likes: 0,
        comments_count: 0
      });
      res.json({ success: true, post });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create community post' });
    }
  });

  app.post('/api/community-posts/:id/like', async (req, res) => {
    try {
      const post = await CommunityPost.findByPk(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      post.likes += 1;
      await post.save();
      res.json({ success: true, post });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to like post' });
    }
  });

  // Journeys (Shifts)
  app.post('/api/journeys', async (req, res) => {
    try {
      const { firebase_uid, date, start_time } = req.body;
      const driver = await User.findOne({ where: { firebase_uid, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      // If there's an already active journey, end it first
      const activeJourney = await Journey.findOne({ where: { driver_id: driver.id, status: 'active' } });
      if (activeJourney) {
        activeJourney.status = 'completed';
        activeJourney.end_time = start_time;
        await activeJourney.save();
      }

      const journey = await Journey.create({
        driver_id: driver.id,
        date: date || new Date().toISOString().split('T')[0],
        start_time,
        status: 'active',
        earnings: 0,
        km_driven: 0,
        hours_worked: 0
      });
      res.json({ success: true, journey });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to start journey' });
    }
  });

  app.put('/api/journeys/:id/end', async (req, res) => {
    try {
      const journey = await Journey.findByPk(req.params.id);
      if (!journey) return res.status(404).json({ error: 'Journey not found' });

      const { end_time, earnings, km_driven, hours_worked } = req.body;
      journey.end_time = end_time;
      journey.earnings = Number(earnings || 0);
      journey.km_driven = Number(km_driven || 0);
      journey.hours_worked = Number(hours_worked || 0);
      journey.status = 'completed';

      await journey.save();
      res.json({ success: true, journey });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to end journey' });
    }
  });

  // Smart Planner Suggestions
  app.post('/api/smart-planners', async (req, res) => {
    try {
      const { firebase_uid, day_of_week, shift, recommended_action, expected_revenue } = req.body;
      const driver = await User.findOne({ where: { firebase_uid, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const planner = await SmartPlanner.create({
        driver_id: driver.id,
        day_of_week,
        shift,
        recommended_action,
        expected_revenue: Number(expected_revenue || 0)
      });
      res.json({ success: true, planner });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create planner action' });
    }
  });

  app.delete('/api/smart-planners/:id', async (req, res) => {
    try {
      const planner = await SmartPlanner.findByPk(req.params.id);
      if (!planner) return res.status(404).json({ error: 'Planner suggestion not found' });
      await planner.destroy();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete planner suggestion' });
    }
  });

  // Taximeter Rates
  app.post('/api/taximeter-rates', async (req, res) => {
    try {
      const { firebase_uid, name, base_price, price_per_km, price_per_minute } = req.body;
      const driver = await User.findOne({ where: { firebase_uid, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const rate = await TaximeterRate.create({
        driver_id: driver.id,
        name,
        base_price: Number(base_price),
        price_per_km: Number(price_per_km),
        price_per_minute: Number(price_per_minute)
      });
      res.json({ success: true, rate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create taximeter rate' });
    }
  });

  app.put('/api/taximeter-rates/:id', async (req, res) => {
    try {
      const rate = await TaximeterRate.findByPk(req.params.id);
      if (!rate) return res.status(404).json({ error: 'Taximeter rate not found' });

      const { name, base_price, price_per_km, price_per_minute } = req.body;
      if (name !== undefined) rate.name = name;
      if (base_price !== undefined) rate.base_price = Number(base_price);
      if (price_per_km !== undefined) rate.price_per_km = Number(price_per_km);
      if (price_per_minute !== undefined) rate.price_per_minute = Number(price_per_minute);

      await rate.save();
      res.json({ success: true, rate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update taximeter rate' });
    }
  });

  app.delete('/api/taximeter-rates/:id', async (req, res) => {
    try {
      const rate = await TaximeterRate.findByPk(req.params.id);
      if (!rate) return res.status(404).json({ error: 'Taximeter rate not found' });
      await rate.destroy();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete taximeter rate' });
    }
  });

  // Simulator Records
  app.post('/api/simulator-records', async (req, res) => {
    try {
      const { firebase_uid, origin, destination, distance_km, duration_mins, calculated_price, net_profit } = req.body;
      const driver = await User.findOne({ where: { firebase_uid, role: 'driver' } });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const record = await SimulatorRecord.create({
        driver_id: driver.id,
        origin,
        destination,
        distance_km: Number(distance_km),
        duration_mins: Number(duration_mins),
        calculated_price: Number(calculated_price),
        net_profit: Number(net_profit)
      });
      res.json({ success: true, record });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save simulator record' });
    }
  });

  // Admin / Manual Insertion for City Events & Demand Regions
  app.post('/api/city-events', async (req, res) => {
    try {
      const { title, date, location, description, is_premium } = req.body;
      const event = await CityEvent.create({
        title,
        date,
        location,
        description,
        is_premium: is_premium !== undefined ? is_premium : true
      });
      res.json({ success: true, event });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create city event' });
    }
  });

  app.post('/api/demand-regions', async (req, res) => {
    try {
      const { name, address, demand_level, best_hours, is_premium } = req.body;
      const region = await DemandRegion.create({
        name,
        address,
        demand_level: demand_level || 'high',
        best_hours,
        is_premium: is_premium !== undefined ? is_premium : true
      });
      res.json({ success: true, region });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create demand region' });
    }
  });

  // Copilot AI Reasoning Endpoint (Gemini)
  let aiClient: any = null;
  function getGeminiClient() {
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || 'MOCK_KEY',
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  app.post('/api/copilot', async (req, res) => {
    try {
      const { message, stats, chatHistory = [] } = req.body;
      
      const systemInstruction = `Você é o Copiloto AI do DriverMetrics Pro, um assistente de estratégia de mobilidade para motoristas de aplicativos (Uber, 99).
O motorista chama-se ${stats?.driver?.name || 'Gustavo'}. Carro: ${stats?.vehicle?.make || 'VW'} ${stats?.vehicle?.model || 'Fox'} (${stats?.vehicle?.year || '2014'}).
Metas mensais: Líquida de R$ ${stats?.driver?.net_income_goal_monthly || 5000} em ${stats?.driver?.work_days_per_month || 22} dias de trabalho.
Dados atuais: Faturamento de R$ ${stats?.totalRevenue || 0}, Lucro líquido estimado R$ ${stats?.totalProfit || 0}, Corridas: ${stats?.ridesCount || 0}.
Custo real calculado por KM do veículo: R$ ${stats?.costPerKm ? stats.costPerKm.toFixed(2) : '0.55'}.

Dê conselhos super práticos, amigáveis e objetivos em português brasileiro sobre como rodar de forma eficiente, economizar combustível, otimizar horários e reduzir custos. Responda em até 3 parágrafos focados em resultados financeiros reais.`;

      const contents = [];
      
      // Add history
      for (const msg of chatHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
      
      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const key = process.env.GEMINI_API_KEY;
      if (!key || key === 'YOUR_API_KEY_HERE') {
        const responses = [
          `Olá, ${stats?.driver?.name || 'Gustavo'}! Analisando seus dados, o custo por KM do seu ${stats?.vehicle?.model || 'veículo'} está estimado em R$ ${stats?.costPerKm ? stats.costPerKm.toFixed(2) : '0.55'}. Para aumentar sua margem de lucro líquido hoje, tente evitar o deslocamento vazio ("rodar batendo lata"). Aguarde chamadas em pontos estratégicos de comércio.`,
          `Fala ${stats?.driver?.name || 'Gustavo'}! Sabia que manter a calibragem do pneu correta reduz em até 5% o gasto de combustível? No seu ${stats?.vehicle?.model || 'veículo'} com consumo de ${stats?.vehicle?.average_consumption_km_l || '12.5'} km/L, isso pode render R$ 15,00 a mais de lucro puro por dia.`,
          `Para atingir sua meta líquida de R$ ${stats?.driver?.net_income_goal_monthly || '5.000,00'}, recomendo concentrar suas corridas nas janelas de alta tarifa dinâmica, como quintas e sextas no fim de tarde perto de centros corporativos.`,
          `Recomendo ficar atento aos eventos do dia em São Paulo. Grandes feiras e eventos esportivos chegam a elevar em 30% a demanda por corridas privadas e aplicativos nas regiões próximas.`
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        return res.json({ response: randomResponse });
      }

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction
        }
      });

      res.json({ response: response.text });
    } catch (error: any) {
      console.error('[Copilot AI Error]', error);
      res.json({ 
        response: `Olá! Tive uma dificuldade temporária para contatar o cérebro AI (Erro: ${error.message || 'Timeout'}), mas recomendo manter o foco nas suas corridas de alta margem de lucro por KM!` 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
