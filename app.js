const textarea = document.getElementById("note-input");
const cardContainer = document.getElementById("card-container");
const emptyState = document.getElementById("empty-state");
const printButton = document.getElementById("print-button");

const MAX_CHARS_PER_CARD = 320;

textarea.addEventListener("input", renderCards);
printButton.addEventListener("click", () => window.print());

renderCards();

function renderCards() {
  const rawText = textarea.value.trim();
  cardContainer.innerHTML = "";

  if (!rawText) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  const cards = buildCards(rawText, MAX_CHARS_PER_CARD);
  const fragment = document.createDocumentFragment();

  cards.forEach((paragraphs, index) => {
    const card = document.createElement("article");
    card.className = "card";

    const numberBadge = document.createElement("span");
    numberBadge.className = "card-number";
    numberBadge.textContent = index + 1;

    const textContainer = document.createElement("div");
    textContainer.className = "card-text";

    paragraphs.forEach(({ text: paragraphText, isParagraphStart }) => {
      const p = document.createElement("p");
      p.textContent = paragraphText;
      if (isParagraphStart) {
        p.classList.add("paragraph-indent");
      }
      textContainer.appendChild(p);
    });

    card.appendChild(numberBadge);
    card.appendChild(textContainer);
    fragment.appendChild(card);
  });

  cardContainer.appendChild(fragment);
}

function buildCards(text, maxCharsPerCard) {
  const cards = [];
  let currentCard = [];
  let currentLength = 0;

  const rawParagraphs = text
    .trim()
    .split(/\n\s*\n+/)
    .map(paragraph =>
      paragraph
        .replace(/\s*\n\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const totalCharacters = rawParagraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
  const estimatedCardCount = Math.max(1, Math.ceil(totalCharacters / maxCharsPerCard));
  const targetCharsPerCard = Math.ceil(totalCharacters / estimatedCardCount);

  const startNewCard = () => {
    if (!currentCard.length) {
      return;
    }
    cards.push(currentCard);
    currentCard = [];
    currentLength = 0;
  };

  const addParagraphToCard = (paragraphText, isParagraphStart) => {
    const trimmed = paragraphText.trim();
    if (!trimmed) {
      return;
    }

    const incomingLength = trimmed.length;
    const projected = currentLength + incomingLength;
    const shouldSplit =
      currentCard.length &&
      (projected > maxCharsPerCard ||
        (projected > targetCharsPerCard && cards.length + 1 < estimatedCardCount));

    if (shouldSplit) {
      startNewCard();
    }

    currentCard.push({ text: trimmed, isParagraphStart });
    currentLength += incomingLength;
  };

  rawParagraphs.forEach(paragraph => {
    const sentences = splitIntoSentences(paragraph);
    let working = "";
    let isFirstChunk = true;

    sentences.forEach(sentence => {
      const proposed = working ? `${working} ${sentence}` : sentence;

      if (proposed.length <= maxCharsPerCard) {
        working = proposed;
        return;
      }

      if (working) {
        addParagraphToCard(working, isFirstChunk);
        isFirstChunk = false;
        working = sentence;
        return;
      }

      addParagraphToCard(sentence, isFirstChunk);
      isFirstChunk = false;
    });

    if (working) {
      addParagraphToCard(working, isFirstChunk);
    }
  });

  if (currentCard.length) {
    cards.push(currentCard);
  }

  return rebalanceCards(cards, maxCharsPerCard);
}

function splitIntoSentences(text) {
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
  const matches = text.match(sentenceRegex);
  return matches ? matches.map(sentence => sentence.trim()) : [text];
}

function rebalanceCards(cards, maxChars) {
  if (cards.length < 2) {
    return cards;
  }

  const maxDifference = 60;

  let changed = true;
  while (changed) {
    changed = false;
    const lengths = cards.map(card => card.reduce((sum, paragraph) => sum + paragraph.text.length, 0));

    for (let i = 0; i < cards.length - 1; i++) {
      const difference = lengths[i] - lengths[i + 1];

      if (difference > maxDifference && cards[i].length > 1) {
        const moved = cards[i].pop();
        if (!moved) {
          continue;
        }

        if (lengths[i + 1] + moved.text.length > maxChars) {
          cards[i].push(moved);
          continue;
        }

        cards[i + 1].unshift(moved);
        changed = true;
        break;
      }

      if (difference < -maxDifference && cards[i + 1].length > 1) {
        const moved = cards[i + 1].shift();
        if (!moved) {
          continue;
        }

        if (lengths[i] + moved.text.length > maxChars) {
          cards[i + 1].unshift(moved);
          continue;
        }

        cards[i].push(moved);
        changed = true;
        break;
      }
    }
  }

  return cards;
}
