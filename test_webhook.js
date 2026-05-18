const url = "https://script.google.com/macros/s/AKfycbzZCYUjBh0uK5NKhtt9mBwGKadFnQHc3TNG-J9jOyTcjjNBeVThmRdqCA3Cg-r4Ggcw/exec";
const payload = { rowArray: ["Test Node.js", "Value 2"] };

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify(payload)
})
.then(res => res.text())
.then(text => console.log("Response:", text))
.catch(err => console.error("Error:", err));
