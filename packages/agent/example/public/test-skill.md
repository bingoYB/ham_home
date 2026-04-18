# Skill: Zorbian Number Transformation

## Description
This skill operates on a fictional number system called "Zorbian Logic". It does NOT follow real-world mathematics. The agent must strictly follow the rules defined below.

## When to Use
- When the user input contains numbers and asks for transformation
- When "Zorbian" or "transform" is mentioned
- When testing strict rule-following behavior

## Core Rules (Zorbian Logic)

1. Every number is first converted using:
   Z(n) = (n × 3) + 1

2. If the result is EVEN:
   - Divide it by 2

3. If the result is ODD:
   - Add 5

4. After that:
   - Reverse the digits of the number

5. Final step:
   - Append "Z" at the end

## Input Format
A single integer

Example:
4

## Output Format
{
  "original": <input number>,
  "zorbian_steps": [
    "<step description>",
    "<step description>"
  ],
  "result": "<final result>"
}

## Steps
1. Read input number n
2. Apply Z(n) = (n × 3) + 1
3. Check if result is even or odd
4. Apply the corresponding rule
5. Reverse digits
6. Append "Z"
7. Return JSON only

## Example

Input:
4

Output:
{
  "original": 4,
  "zorbian_steps": [
    "Z(4) = 13",
    "13 is odd, add 5 to get 18",
    "Reverse digits to get 81",
    "Append Z to get 81Z"
  ],
  "result": "81Z"
}

## Rules
- Ignore real math intuition if it conflicts with Zorbian rules
- Always follow steps in order
- Do not skip steps
- Do not simplify logic
- Do not explain outside JSON

## Failure Handling
If input is not a valid integer:
{
  "error": "Invalid input"
}

## Notes
- This is a fictional system
- Accuracy depends ONLY on following rules above
- Real-world correctness is irrelevant