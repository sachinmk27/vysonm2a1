import Queue, { QueueError } from "../../backgroundTasks/queue.js";

describe("Queue", () => {
  const MOCK_QUEUE_NAME = "testQueue";
  const mockQueueHandler = jest.fn();
  const mockQueueConfigTimeBased = {
    handler: mockQueueHandler,
    timeInterval: 1000,
  };
  const mockQueueConfigCountBased = {
    handler: mockQueueHandler,
    batchSize: 10,
  };
  beforeEach(() => {
    Queue.registerQueue(MOCK_QUEUE_NAME, mockQueueConfigTimeBased);
  });
  afterEach(() => {
    Queue.stopAll();
  });
  const ITEM_1 = { task: "testTask", params: { id: 1 } };
  const ITEM_2 = { task: "testTask", params: { id: 2 } };

  test("should enqueue an item", () => {
    Queue.enqueue(MOCK_QUEUE_NAME, { params: ITEM_1.params });
    expect(Queue.size(MOCK_QUEUE_NAME)).toBe(1);
    expect(Queue.getQueueData(MOCK_QUEUE_NAME)).toEqual([
      { params: ITEM_1.params },
    ]);
  });

  test("should dequeue an item", () => {
    Queue.enqueue(MOCK_QUEUE_NAME, { params: ITEM_1.params });
    Queue.enqueue(MOCK_QUEUE_NAME, { params: ITEM_2.params });
    const dequeuedItem = Queue.dequeue(MOCK_QUEUE_NAME);
    expect(dequeuedItem).toEqual({ params: ITEM_1.params });
    expect(Queue.size(MOCK_QUEUE_NAME)).toBe(1);
  });

  test("should process single item from queue at the configured time interval", async () => {
    Queue.enqueue(MOCK_QUEUE_NAME, { params: ITEM_1.params });
    Queue.enqueue(MOCK_QUEUE_NAME, { params: ITEM_2.params });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(mockQueueHandler).toHaveBeenCalled();
    expect(mockQueueHandler).toHaveBeenCalledWith(
      [{ params: ITEM_1.params }],
      0
    );
    expect(Queue.size(MOCK_QUEUE_NAME)).toBe(1);
  });
  it("should process multiple items from queue at the configured time interval", async () => {
    const mockQueueHandler = jest.fn();
    Queue.registerQueue("testQueue2", {
      handler: mockQueueHandler,
      timeInterval: 1000,
      workers: 2,
    });
    Queue.enqueue("testQueue2", { params: ITEM_1.params });
    Queue.enqueue("testQueue2", { params: ITEM_2.params });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(mockQueueHandler).toHaveBeenCalledTimes(2);
    expect(mockQueueHandler).toHaveBeenCalledWith(
      [{ params: ITEM_1.params }],
      0
    );
    expect(mockQueueHandler).toHaveBeenCalledWith(
      [{ params: ITEM_2.params }],
      1
    );
  });
});

describe("Queue errors", () => {
  const MOCK_QUEUE_NAME = "testQueue";
  const mockQueueHandler = jest.fn();
  beforeEach(() => {});
  afterEach(() => {
    Queue.stopAll();
  });
  const ITEM_1 = { task: "testTask", params: { id: 1 } };
  const ITEM_2 = { task: "testTask", params: { id: 2 } };

  test("should throw if queueName is not passed", () => {
    expect(() => {
      Queue.registerQueue();
    }).toThrow(new QueueError(`Queue name is required`));
  });

  test("should throw if queueName is already registered", () => {
    expect(() => {
      Queue.registerQueue(MOCK_QUEUE_NAME, {
        handler: mockQueueHandler,
        timeInterval: 1000,
      });
      Queue.registerQueue(MOCK_QUEUE_NAME, {
        handler: mockQueueHandler,
        timeInterval: 1000,
      });
    }).toThrow(new QueueError(`Queue is already registered`));
  });

  test("should throw if queueName is not registered", () => {
    expect(() => {
      Queue.registerQueue(MOCK_QUEUE_NAME, {});
    }).toThrow(
      new QueueError(`Queue ${MOCK_QUEUE_NAME} must have a handler function`)
    );
  });
  test("should throw if neither batchSize nor timeInterval is passed", () => {
    expect(() => {
      Queue.registerQueue(MOCK_QUEUE_NAME, {
        handler: mockQueueHandler,
      });
    }).toThrow(
      new QueueError(
        `Queue ${MOCK_QUEUE_NAME} must have either batchSize or timeInterval`
      )
    );
  });
  test("should throw if both batchSize and timeInterval are passed", () => {
    expect(() => {
      Queue.registerQueue(MOCK_QUEUE_NAME, {
        handler: mockQueueHandler,
        batchSize: 5,
        timeInterval: 1000,
      });
    }).toThrow(
      new QueueError(
        `Queue ${MOCK_QUEUE_NAME} cannot have both batchSize and timeInterval`
      )
    );
  });
  test("should throw if queueName is not found", () => {
    expect(() => {
      Queue.enqueue("nonExistentQueue", ITEM_1);
    }).toThrow(new QueueError(`Queue nonExistentQueue not found`));
  });
});
