window.addEventListener("load", function() {
    let preloader = document.getElementById("preloader");
    let mainContent = document.getElementById("main-content");

    // Fade out effect
    setTimeout(() => {
        preloader.style.animation = "fadeOut 1s ease-out";
        
        // Remove preloader after animation
        setTimeout(() => {
            preloader.style.display = "none";
            mainContent.style.display = "block";
        }, 1000);
    }, 4000); // Changed to 4000ms (4 seconds) before starting fade out
});

// Add sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', function(event) {
        if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('active');
        }
    });
});

// Add these variables at the top
const BASE_PRICES = {
    'Bike': 15,
    'Economy': 25,
    'Sedan': 35,
    'Luxury': 50
};

const PRICE_PER_KM = {
    'Bike': 2,
    'Economy': 3,
    'Sedan': 4,
    'Luxury': 6
};

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

// Function to update prices based on distance
function updatePrices(distance) {
    Object.keys(BASE_PRICES).forEach(rideType => {
        const basePrice = BASE_PRICES[rideType];
        const pricePerKm = PRICE_PER_KM[rideType];
        const totalPrice = (basePrice + (distance * pricePerKm)).toFixed(2);
        
        // Find the price element for this ride type and update it
        const priceElement = document.querySelector(`.ride-card:has(h4:contains('${rideType}')) .price`);
        if (priceElement) {
            priceElement.textContent = `CHF ${totalPrice}`;
        }
    });
}

// Modify the form submission handler
document.addEventListener('DOMContentLoaded', function() {
    const bookingForm = document.getElementById('booking-form');
    const rideOptions = document.getElementById('ride-options');

    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // Show ride options
        rideOptions.style.display = 'block';
        // Smooth scroll to ride options
        rideOptions.scrollIntoView({ behavior: 'smooth' });
    });

    // Add click handlers for ride selection
    const selectButtons = document.querySelectorAll('.select-ride');
    selectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const rideType = this.textContent.replace('Select ', '');
            alert(`You have selected ${rideType}. Proceeding to confirmation...`);
            // Here you can add code to proceed to the next step (payment, confirmation, etc.)
        });
    });
});

let map;
let pickupMarker = null;
let destinationMarker;
let currentField;
let directionsLine;
let modalMap = null;

// Initialize map functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize main map
    map = L.map('map').setView([47.3769, 8.5417], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initialize form handlers
    const bookingForm = document.getElementById('booking-form');
    const rideOptions = document.getElementById('ride-options');
    const pickupInput = document.getElementById('pickup-location');
    const destinationInput = document.getElementById('destination');

    // Get user's current location
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            map.setView([userLat, userLng], 15);
            
            // Set pickup location
            reverseGeocode(userLat, userLng, pickupInput);
            if (pickupMarker) map.removeLayer(pickupMarker);
            pickupMarker = L.marker([userLat, userLng]).addTo(map);
        });
    }

    // Handle form submission
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (pickupMarker && destinationMarker) {
            // Calculate route
            const distance = calculateDistance(
                pickupMarker.getLatLng().lat,
                pickupMarker.getLatLng().lng,
                destinationMarker.getLatLng().lat,
                destinationMarker.getLatLng().lng
            );

            // Update prices based on distance
            updatePrices(distance);

            // Show ride options
            rideOptions.style.display = 'block';
            
            // Draw route line
            drawRoute(pickupMarker.getLatLng(), destinationMarker.getLatLng());
        }
    });

    // Add input listeners for location search
    setupLocationSearch(pickupInput, 'pickup');
    setupLocationSearch(destinationInput, 'destination');
});

// Location search setup
function setupLocationSearch(input, type) {
    let timeout = null;
    
    input.addEventListener('input', function() {
        if (timeout) clearTimeout(timeout);
        
        timeout = setTimeout(() => {
            const query = this.value;
            if (query.length > 2) {
                searchLocation(query, type);
            }
        }, 300);
    });
}

// Search location using Nominatim
async function searchLocation(query, type) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        
        if (data.length > 0) {
            const location = data[0];
            const latlng = [parseFloat(location.lat), parseFloat(location.lon)];
            
            if (type === 'pickup') {
                if (pickupMarker) map.removeLayer(pickupMarker);
                pickupMarker = L.marker(latlng).addTo(map);
            } else {
                if (destinationMarker) map.removeLayer(destinationMarker);
                destinationMarker = L.marker(latlng).addTo(map);
            }
            
            map.setView(latlng, 15);
            
            if (pickupMarker && destinationMarker) {
                drawRoute(pickupMarker.getLatLng(), destinationMarker.getLatLng());
            }
        }
    } catch (error) {
        console.error('Error searching location:', error);
    }
}

// Draw route between two points
function drawRoute(start, end) {
    if (directionsLine) map.removeLayer(directionsLine);
    
    directionsLine = L.polyline([start, end], {
        color: 'black',
        weight: 3,
        opacity: 0.7
    }).addTo(map);
    
    map.fitBounds(directionsLine.getBounds(), {
        padding: [50, 50]
    });
}

// Reverse geocode coordinates to address
async function reverseGeocode(lat, lon, input) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        );
        const data = await response.json();
        input.value = data.display_name;
    } catch (error) {
        console.error('Error reverse geocoding:', error);
    }
}

// Add this to your existing JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const closeSidebar = document.querySelector('.close-sidebar');

    // Open sidebar
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when sidebar is open
    });

    // Close sidebar function
    function closeSidebarMenu() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Close sidebar when clicking close button
    closeSidebar.addEventListener('click', closeSidebarMenu);

    // Close sidebar when clicking overlay
    sidebarOverlay.addEventListener('click', closeSidebarMenu);

    // Close sidebar when pressing Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebarMenu();
        }
    });

    // Profile navigation
    const profileButton = document.getElementById('profile-button');
    if (profileButton) {
        profileButton.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default anchor behavior
            window.location.href = 'profile.html';
        });
    }

    // Add help navigation
    const helpButton = document.getElementById('help-button');
    if (helpButton) {
        helpButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'help.html';
        });
    }

    // Ride selection functionality
    const rideCards = document.querySelectorAll('.ride-card');
    const confirmRideBtn = document.querySelector('.confirm-ride-btn');

    rideCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selected class from all cards
            rideCards.forEach(c => c.classList.remove('selected'));
            // Add selected class to clicked card
            this.classList.add('selected');

            const rideType = this.getAttribute('data-type');
            const price = this.querySelector('.price').textContent;
            const pickup = document.getElementById('pickup-location').value;
            const destination = document.getElementById('destination').value;

            // Create and store current ride
            currentRide = createRide(rideType, price, pickup, destination);
        });
    });

    if (confirmRideBtn) {
        confirmRideBtn.addEventListener('click', function() {
            const selectedRide = document.querySelector('.ride-card.selected');
            if (selectedRide && currentRide) {
                // Add ride to history
                rideHistory.unshift(currentRide); // Add to beginning of array
                localStorage.setItem('rideHistory', JSON.stringify(rideHistory));

                // Show confirmation
                alert(`Booking confirmed!\nRide Type: ${currentRide.type}\nPrice: ${currentRide.price}`);
                
                // Update ride history in profile if we're on the profile page
                updateRideHistory();
                
                // Hide ride options
                document.getElementById('ride-options').style.display = 'none';
                
                // Reset current ride
                currentRide = null;
            } else {
                alert('Please select a ride type');
            }
        });
    }
});

// Function to update ride history display
function updateRideHistory() {
    const tripsList = document.querySelector('.trips-list');
    if (tripsList) {
        tripsList.innerHTML = ''; // Clear existing trips
        
        // Get latest rides from localStorage
        const rides = JSON.parse(localStorage.getItem('rideHistory')) || [];
        
        // Display latest 5 rides
        rides.slice(0, 5).forEach(ride => {
            const date = new Date(ride.date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit'
            });
            
            const tripHtml = `
                <div class="trip-item">
                    <div class="trip-icon">
                        <i class="fas fa-car"></i>
                    </div>
                    <div class="trip-details">
                        <h3>${ride.pickup} to ${ride.destination}</h3>
                        <p>${formattedDate}</p>
                        <span class="trip-price">${ride.price}</span>
                    </div>
                </div>
            `;
            
            tripsList.insertAdjacentHTML('beforeend', tripHtml);
        });
    }
}

// Call this when the profile page loads
if (window.location.pathname.includes('profile.html')) {
    updateRideHistory();
}

/******************************************
 * GLOBAL VARIABLES AND UTILITIES
 ******************************************/
// Store user and ride data
let rideHistory = JSON.parse(localStorage.getItem('rideHistory')) || [];
let currentRide = null;

// Arrays for random driver generation
const driverNames = [
    "John Smith", "Maria Garcia", "David Chen", "Sarah Johnson", 
    "Michael Brown", "Emma Wilson", "James Taylor", "Lisa Anderson"
];

const carModels = [
    "Toyota Camry", "Honda Civic", "Tesla Model 3", "BMW 3 Series",
    "Mercedes C-Class", "Audi A4", "Volkswagen Passat", "Hyundai Sonata"
];

/******************************************
 * UTILITY FUNCTIONS
 ******************************************/
// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    });
}

// Generate random car number
function generateCarNumber() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    let carNumber = "";
    
    carNumber += letters[Math.floor(Math.random() * letters.length)];
    carNumber += letters[Math.floor(Math.random() * letters.length)];
    carNumber += "-";
    for(let i = 0; i < 4; i++) {
        carNumber += numbers[Math.floor(Math.random() * numbers.length)];
    }
    
    return carNumber;
}

/******************************************
 * AUTHENTICATION FUNCTIONS
 ******************************************/
// Handle user login
function handleLogin(email, password) {
    const storedUser = JSON.parse(localStorage.getItem('userData'));
    if (storedUser && storedUser.email === email && storedUser.password === password) {
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'Homepage.html';
    } else {
        alert('Invalid credentials');
    }
}

// Handle user signup
function handleSignup(userData) {
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('isLoggedIn', 'true');
    alert('Account created successfully! Welcome to Cruise Cabs!');
    window.location.href = 'Homepage.html';
}

/******************************************
 * RIDE MANAGEMENT FUNCTIONS
 ******************************************/
// Create new ride
function createRide(rideType, price, pickup, destination) {
    const driverName = driverNames[Math.floor(Math.random() * driverNames.length)];
    const carModel = carModels[Math.floor(Math.random() * carModels.length)];
    const carNumber = generateCarNumber();

    return {
        id: Date.now(),
        type: rideType,
        price: price,
        pickup: pickup,
        destination: destination,
        date: new Date().toISOString(),
        status: 'Active',
        driver: {
            name: driverName,
            car: carModel,
            carNumber: carNumber
        }
    };
}

// Update ride history display
function updateRideHistory(filter = 'all') {
    const ridesList = document.querySelector('.rides-list');
    const noRides = document.querySelector('.no-rides');
    
    if (!ridesList) return;

    let rides = JSON.parse(localStorage.getItem('rideHistory')) || [];
    
    // Apply time filter
    if (filter !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        if (filter === 'month') {
            filterDate.setMonth(filterDate.getMonth() - 1);
        } else if (filter === 'week') {
            filterDate.setDate(filterDate.getDate() - 7);
        }
        
        rides = rides.filter(ride => new Date(ride.date) > filterDate);
    }

    if (rides.length === 0) {
        ridesList.style.display = 'none';
        noRides.style.display = 'block';
    } else {
        ridesList.style.display = 'block';
        noRides.style.display = 'none';
        ridesList.innerHTML = rides.map(createRideCard).join('');
    }
}

/******************************************
 * PAYMENT FUNCTIONS
 ******************************************/
// Format card input
function formatCardNumber(input) {
    let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    input.value = formattedValue;
}

// Format expiry date
function formatExpiry(input) {
    let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length > 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
    }
    input.value = value;
}

/******************************************
 * UI COMPONENT FUNCTIONS
 ******************************************/
// Create ride card HTML
function createRideCard(ride) {
    return `
        <div class="ride-card">
            <div class="ride-header">
                <span class="ride-date">${formatDate(ride.date)}</span>
                <span class="ride-price">${ride.price}</span>
            </div>
            <div class="ride-details">
                <div class="location-markers">
                    <div class="location-marker"></div>
                    <div class="location-marker destination"></div>
                </div>
                <div class="locations">
                    <div class="location-text">${ride.pickup}</div>
                    <div class="location-text">${ride.destination}</div>
                </div>
            </div>
            <div class="ride-info">
                <div class="info-item">
                    <i class="fas fa-car"></i>
                    <span>${ride.type}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-user"></i>
                    <span>${ride.driver.name}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-tag"></i>
                    <span>${ride.driver.car} • ${ride.driver.carNumber}</span>
                </div>
            </div>
        </div>
    `;
}

// Create saved card element
function createSavedCardElement(card) {
    return `
        <div class="saved-card" data-card-id="${card.id}">
            <i class="fas fa-credit-card card-icon"></i>
            <div class="card-details">
                <div class="card-number">•••• •••• •••• ${card.number.slice(-4)}</div>
                <div class="card-expiry">Expires ${card.expiry}</div>
            </div>
            <i class="fas fa-trash delete-card"></i>
        </div>
    `;
}

/******************************************
 * EVENT LISTENERS
 ******************************************/
document.addEventListener('DOMContentLoaded', function() {
    // Check login status and update UI
    checkLoginStatus();

    // Handle signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
    }

    // Handle login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Handle payment form
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        setupPaymentFormListeners(paymentForm);
    }

    // Handle ride selection
    const rideCards = document.querySelectorAll('.ride-card');
    if (rideCards.length) {
        setupRideCardListeners(rideCards);
    }

    // Update ride history if on history page
    if (window.location.pathname.includes('ride-history.html')) {
        updateRideHistory();
    }

    // Add this after your other DOMContentLoaded event listeners
    const scheduleLaterBtn = document.getElementById('schedule-later-btn');
    
    if (scheduleLaterBtn) {
        scheduleLaterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showScheduleModal();
        });
    }
});

/******************************************
 * EVENT HANDLER FUNCTIONS
 ******************************************/
function handleSignupSubmit(e) {
    e.preventDefault();
    const userData = {
        name: document.getElementById('fullname').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        password: document.getElementById('password').value,
        dateJoined: new Date().toISOString()
    };
    handleSignup(userData);
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    handleLogin(email, password);
}

// Sign out functionality
document.addEventListener('DOMContentLoaded', function() {
    const signoutBtn = document.getElementById('signout-btn');
    
    if (signoutBtn) {
        signoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Clear any stored user data/tokens
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            sessionStorage.clear();
            
            // Optional: Show a success message
            alert('Successfully signed out!');
            
            // Redirect to login page
            window.location.href = 'login.html';
        });
    }
});

// ... Additional event handler functions ...

// Function to get current location
function getCurrentLocation(inputField) {
    if ("geolocation" in navigator) {
        // Show loading state
        inputField.value = "Getting location...";
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                // Get coordinates
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                // Reverse geocode to get address
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
                    .then(response => response.json())
                    .then(data => {
                        // Update input field with address
                        inputField.value = data.display_name;
                        
                        // If map is initialized, update marker
                        if (map) {
                            // Remove existing marker if any
                            if (pickupMarker) {
                                map.removeLayer(pickupMarker);
                            }
                            
                            // Add new marker
                            pickupMarker = L.marker([latitude, longitude]).addTo(map);
                            
                            // Center map on location
                            map.setView([latitude, longitude], 15);
                        }
                    })
                    .catch(error => {
                        console.error('Error getting address:', error);
                        inputField.value = `${latitude}, ${longitude}`;
                    });
            },
            function(error) {
                // Handle errors
                console.error('Error getting location:', error);
                inputField.value = "";
                alert("Unable to get your location. Please check your location permissions.");
            }
        );
    } else {
        alert("Geolocation is not supported by your browser");
    }
}

// Update the location input groups event listeners
document.addEventListener('DOMContentLoaded', function() {
    const pickupInput = document.getElementById('pickup-location');
    const destinationInput = document.getElementById('destination');
    
    // Add click handlers for the map buttons
    document.querySelectorAll('.map-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const inputField = this.previousElementSibling; // Get the input field before the button
            if (inputField.id === 'pickup-location') {
                getCurrentLocation(inputField);
            } else {
                // For destination, still show the map modal
                showMapModal('destination');
            }
        });
    });
});

// Update showMapModal function to work with the new functionality
function showMapModal(type) {
    if (type === 'destination') {
        const mapModal = document.getElementById('map-modal');
        mapModal.style.display = 'block';
        
        // Initialize modal map if not already done
        if (!modalMap) {
            modalMap = L.map('modal-map').setView([0, 0], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(modalMap);
        }
        
        // Update modal map size after it's visible
        setTimeout(() => {
            modalMap.invalidateSize();
        }, 100);
    }
}

// Add these new functions
function showScheduleModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="schedule-modal" class="modal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>Schedule Your Ride</h2>
                <div class="schedule-form">
                    <div class="form-group">
                        <label for="schedule-date">Date:</label>
                        <input type="date" id="schedule-date" min="${getTodayDate()}" required>
                    </div>
                    <div class="form-group">
                        <label for="schedule-time">Time:</label>
                        <input type="time" id="schedule-time" required>
                    </div>
                    <button class="confirm-schedule-btn">Confirm Schedule</button>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('schedule-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const confirmBtn = modal.querySelector('.confirm-schedule-btn');

    // Show modal
    modal.style.display = 'block';

    // Close modal functionality
    closeBtn.onclick = function() {
        modal.remove();
    }

    // Close when clicking outside
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    }

    // Handle schedule confirmation
    confirmBtn.addEventListener('click', function() {
        const date = document.getElementById('schedule-date').value;
        const time = document.getElementById('schedule-time').value;
        
        if (date && time) {
            const scheduledDateTime = new Date(`${date} ${time}`);
            if (scheduledDateTime > new Date()) {
                // Store scheduled time
                localStorage.setItem('scheduledRide', JSON.stringify({
                    datetime: scheduledDateTime.toISOString(),
                    pickup: document.getElementById('pickup-location').value,
                    destination: document.getElementById('destination').value
                }));
                
                alert(`Ride scheduled for ${scheduledDateTime.toLocaleString()}`);
                modal.remove();
                
                // Show ride options
                document.getElementById('ride-options').style.display = 'block';
            } else {
                alert('Please select a future date and time');
            }
        } else {
            alert('Please select both date and time');
        }
    });
}

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

document.addEventListener("DOMContentLoaded", function () {
    const scheduleBtn = document.getElementById("scheduleLaterBtn");
    const dateTimeInput = document.getElementById("scheduleDateTime");

    scheduleBtn.addEventListener("click", function () {
        dateTimeInput.style.display = "block"; // Show the date-time picker
        dateTimeInput.focus(); // Focus on it so the user can select a date
    });

    dateTimeInput.addEventListener("change", function () {
        alert("You have scheduled a ride for: " + dateTimeInput.value);
        dateTimeInput.style.display = "none"; // Hide after selection
    });
});

const signUpButton=document.getElementById('signUpButton');
const signInButton=document.getElementById('signInButton');
const signInForm=document.getElementById('signIn');
const signUpForm=document.getElementById('signup');

signUpButton.addEventListener('click',function(){
    signInForm.style.display="none";
    signUpForm.style.display="block";
})
signInButton.addEventListener('click', function(){
    signInForm.style.display="block";
    signUpForm.style.display="none";
})