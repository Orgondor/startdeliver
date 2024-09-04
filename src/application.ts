const api1 = "https://magnetic-tested-hardware.glitch.me";
const api1key = process.env.API_KEY_1;

const api2 = "https://guttural-deciduous-webserver.glitch.me";
const api2key = process.env.API_KEY_2;

type Customer = {
  name: string;
  activeAt: string;
  arr: number;
  teamMemberId: number[];
  id?: number | string;
} & Record<string, unknown>;

const isCustomer = (
  input: unknown,
  requireId: boolean = false,
): input is Customer => {
  if (typeof input !== "object") {
    return false;
  }

  if (input === null) {
    return false;
  }

  if ("name" in input === false || typeof input.name !== "string") {
    return false;
  }

  if ("activeAt" in input === false || typeof input.activeAt !== "string") {
    return false;
  }

  if ("arr" in input === false || typeof input.arr !== "number") {
    return false;
  }

  if ("teamMemberId" in input === false || !Array.isArray(input.teamMemberId)) {
    return false;
  }

  for (const teamId of input.teamMemberId) {
    if (typeof teamId !== "number") {
      return false;
    }
  }

  if (requireId) {
    if ("id" in input === false) {
      return false;
    }
  }

  return true;
};

const isCustomerArray = (
  input: unknown,
  requireId: boolean = false,
): input is Customer[] => {
  if (!Array.isArray(input)) {
    return false;
  }

  for (const entry of input) {
    if (!isCustomer(entry, requireId)) {
      return false;
    }
  }

  return true;
};

const fetchCustomersFromAPI1 = async (
  limit: number = 10,
  offset: number = 0,
): Promise<Customer[]> => {
  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  const url = new URL(`/api/v2/customer?${searchParams.toString()}`, api1);

  const result = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: api1key,
    },
  });

  if (result.status === 200) {
    const body = await result.json();

    if (!isCustomerArray(body)) {
      throw new Error("fetchCustomersFromAPI1 - Invalid customer data");
    }

    return body;
  } else {
    throw new Error(
      `fetchCustomersFromAPI1 - Requset failed with status: ${result.status}`,
    );
  }
};

const updateOrCreateCustomerInAPI2 = async (
  customer: Customer,
): Promise<void> => {
  const searchParams = new URLSearchParams({ name: customer.name });
  const getUrl = new URL(`/api/v3/client?${searchParams.toString()}`, api2);

  const getResult = await fetch(getUrl, {
    method: "GET",
    headers: {
      Authorization: api2key,
    },
  });

  if (getResult.status === 200) {
    const body = await getResult.json();

    if (!isCustomerArray(body, true)) {
      throw new Error("updateOrCreateCustomerInAPI2 - Invalid customer data");
    }

    let method = "POST";
    let url = "/api/v3/client";

    if (body.length) {
      method = "PUT";
      url = `${url}/${body[0].id}`;
    }

    const postPutUrl = new URL(url, api2);

    const postPutResult = await fetch(postPutUrl, {
      method,
      headers: {
        Authorization: api2key,
      },
      body: JSON.stringify({
        name: customer.name,
        activeAt: customer.activeAt,
        arr: customer.arr,
        teamMemberId: customer.teamMemberId,
      }),
    });

    if (postPutResult.status !== 200) {
      throw new Error(
        `updateOrCreateCustomerInAPI2 - ${method} Requset failed with status: ${postPutResult.status}`,
      );
    }
  } else {
    throw new Error(
      `updateOrCreateCustomerInAPI2 - GET Requset failed with status: ${getResult.status}`,
    );
  }
};

const syncCustomers = async (
  numberOfCustomers: number,
  batchSize: number,
  offset: number = 0,
) => {
  console.log(
    `Synchronizing customers ${offset + 1} through ${offset + numberOfCustomers} in batches of ${batchSize}`,
  );

  try {
    for (
      let processed = 0, i = 1;
      processed < numberOfCustomers;
      processed += batchSize, i++
    ) {
      console.log(`Synchronizing batch ${i}`);
      const limit = Math.min(batchSize, numberOfCustomers - processed);
      const customers = await fetchCustomersFromAPI1(limit, offset + processed);

      for (const customer of customers) {
        await updateOrCreateCustomerInAPI2(customer);
      }
    }
  } catch (error) {
    console.error("Sync failed:", error);
    return;
  }

  console.log("Sync completed");
};

syncCustomers(3, 2, 1);
