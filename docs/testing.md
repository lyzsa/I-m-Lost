# Testing

## Automated checks

```sh
npm run typecheck   # TypeScript, including the contract check on both backends
npm test            # unit tests (Node's built-in test runner via tsx)
npm run build       # production build
```

GitHub Actions runs all three on every push and pull request ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

| File | Covers |
| --- | --- |
| [`tests/domain.test.ts`](../tests/domain.test.ts) | Review comes before Next, even on empty slides; overlap counts every reason; I'm Lost adds no heat |
| [`tests/mock.test.ts`](../tests/mock.test.ts) | The contract on the mock backend: join codes and errors, ended classes, live updates, one I'm Lost per slide, retry safety, validation, *Other* text, students only seeing their own marks, instructor strokes (retry safety, order, removal, validation) |
| [`tests/instructor.test.ts`](../tests/instructor.test.ts) | Instructor logic: Review / Next / end of class, slide stats, heatmap without duplicates, confusion spots and their reasons, *Other* responses, live stroke events, finding the spot under the pointer |

The real Supabase backend and the AI routes were tested by hand against the team's Supabase project and Gemini (see the commit messages for C2, C4 and the annotations backend).

## Manual test on real devices

Use the live site (or a local build with `NEXT_PUBLIC_USE_MOCK=false`) with a laptop for the instructor and at least two phones. Mock mode only works within one browser, so phones need the real backend.

### Join and follow

1. Laptop: start page → *I'm the instructor* → choose a short PDF → *Create class*. A code, a QR code and "0 joined" appear.
2. Phones: scan the QR code (or open `/join` and type the code). The joined count goes up. Both phones show slide 1.
3. Laptop: *Next* / jump to slide 2. Both phones follow.
4. Phone 1: tap slide 1 in the thumbnail strip. It stays there when the laptop moves on; tapping the **LIVE** slide returns.

### Feedback

5. Phone 1: *I'm Lost*. The laptop's I'm Lost count goes up. Tapping it again on the same slide is refused.
6. Phone 1: *Highlight the exact part*, highlight a line, pick *Need an example*, *Save for Later*. An orange box stays on the slide.
7. Phone 2: highlight the same line, pick *Other*, type a question, *Explain Now*. An explanation ending in "Source: Slide N" appears, and a 💡 appears beside the slide.

### Review

8. Laptop: *Review*. The heatmap shows the overlap; with two students on the same line a numbered spot appears. Hover it to see reasons; click it to pin it and open the *Other* responses.
9. Toggle the heatmap off (eye icon) and on.

### Instructor ink

10. Laptop (or iPad): *Draw on slide*, draw a circle. It appears on both phones. *Undo* removes it from the phones too.
11. iPad with Apple Pencil: the pencil draws, one finger moves the slide, two fingers zoom.

### End of class

12. Laptop: *End class now* → *Yes, end class*. The summary shows every slide with spots, donut charts and responses. Move the slider to change how many students make a spot.
13. Phones: a pop-up recaps today's AI explanations. *Open My Review* → *Make my study guide*.

### Errors

14. `/join` with a wrong code says "No class with that code". Joining an ended class says "This class has ended".
15. Turn a phone's network off, mark something, turn it back on and retry. The mark is saved once.

## Known limitations

- Mock mode can't sync between different browsers or devices, and its AI answers are placeholders.
- The mock stores slides in `localStorage` (about 5 MB), so large PDFs may fill it. Reset with `localStorage.removeItem("lost-mock-db-v1")`.
