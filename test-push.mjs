// test-push.mjs
const token = "cUuV_je9Tha1IIhMteHeSg:APA91bFjdRmkXo5IMY6Wy4uf5FRQK5bSZlTZJGvis6_lepsgePkDnttonaOWNAQLGX241oo3ZTWLFRqs-6VyvOqXAIQBXZLnklx-HwFBzG6qx9c4VK9cjT4";

fetch('http://localhost:5000/api/test-push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ token: token }),
})
.then(response => response.json())
.then(data => console.log('Response from server:', data))
.catch(error => console.error('Error:', error));