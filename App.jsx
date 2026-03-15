import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';

// Layout & Components
import Layout from './components/Layout';

// Pages
import Dashboard from './components/Dashboard';
import Visualization from './pages/Visualization';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Satellites from './pages/Satellites';
import Launches from './pages/Launches';
import Home from './pages/Home';

// Socket connection
const socket = io('http://localhost:5000');

function App() {
    const [orbitData, setOrbitData] = useState({
        objects: [],
        stats: {},
        last_updated: 0
    });

    const [connected, setConnected] = useState(false);

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to OrbitOPS Real-time Stream');
            setConnected(true);
        });

        socket.on('orbital_data', (data) => {
            console.log('Received orbital_data via socket — objects:', (data.objects || []).length, ' source:', data.source);
            setOrbitData(data);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from stream');
            setConnected(false);
        });

        return () => {
            socket.off('connect');
            socket.off('orbital_data');
            socket.off('disconnect');
        };
    }, []);

    // Do an initial REST fetch to ensure full dataset available even if socket update is partial
    useEffect(() => {
        handleRefresh();
    }, []);

    const handleRefresh = () => {
        // Always fetch up to 5000 objects for dashboard
        fetch('http://localhost:5000/api/debris?limit=5000')
            .then(res => res.json())
            .then(data => {
                if (data.objects) setOrbitData(data);
            })
            .catch(err => console.error(err));
    };


    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />

                    <Route
                        path="/dashboard"
                        element={
                            <div className="relative z-10 w-full h-full overflow-hidden">
                                <Dashboard
                                    data={orbitData.objects}
                                    stats={orbitData.stats}
                                    onRefresh={handleRefresh}
                                    lastUpdated={orbitData.last_updated}
                                    source={orbitData.source}
                                />
                            </div>
                        }
                    />

                    <Route path="/visualization" element={<Visualization />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/satellites" element={<Satellites />} />
                    <Route path="/launches" element={<Launches />} />

                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
