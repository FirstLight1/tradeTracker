function handleCardInput(input){
    const container = document.querySelector(".cards-container")
    const cards = document.querySelectorAll(".card")
    const currentCard = input.closest('.card');
    const lastCard = cards[cards.length - 1];

    if(currentCard ==lastCard && input.value.trim() !== ''){
        const newCard = lastCard.cloneNode(true);

        newCard.querySelectorAll('input').forEach(el =>{
            if (el.type == 'checkbox') {
                el.checked = false;
            } else{
                el.value = '';
            }
        });

        newCard.querySelectorAll('select').forEach(sel => {
        sel.selectedIndex = 0;
        });

        const newCardName = newCard.querySelector('.marketValue');
        newCardName.oninput = function () {
        handleCardInput(this);
      };
      const test = lastCard.querySelector('select[name=condition').value;
      console.log(test);
      container.appendChild(newCard)
    }
}

let cards = [];




