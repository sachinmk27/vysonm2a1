import * as Queue from "../../backgroundTasks/queue.js";

describe("Queue", () => {
  beforeEach(() => {
    Queue.queue.length = 0;
  });
  afterAll(() => {
    Queue.queue.length = 0;
  });
  const ITEM_1 = { task: "testTask", params: { id: 1 } };
  const ITEM_2 = { task: "testTask", params: { id: 2 } };

  test("should enqueue an item", () => {
    Queue.enqueue(ITEM_1);
    expect(Queue.queue.length).toBe(1);
    expect(Queue.queue[0]).toEqual(ITEM_1);
  });

  test("should dequeue an item", () => {
    Queue.enqueue(ITEM_1);
    Queue.enqueue(ITEM_2);
    const dequeuedItem = Queue.dequeue();
    expect(dequeuedItem).toEqual(ITEM_1);
    expect(Queue.queue.length).toBe(1);
  });
});
