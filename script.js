fetch("./data/questions.json")
  .then(response => response.json())
  .then(data => {
    console.log(data)
  })
