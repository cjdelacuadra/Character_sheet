character header:
- armor and weapon ReadSlots (Chest, Weapon, Off-Hand) should also show a stat breakdown on click

armoury & shop:
  - DRAG & DROP implementation:
    - use @dnd-kit/core
    - draggable: Armoury item cards, equipped slot items
    - droppable: equipment slots (validate by slot type), armoury grid
    - visual feedback: slot highlights on hover while dragging compatible item
    - invalid drop (wrong slot type) → snap back with a brief shake animation
