import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getFileContents: vi.fn(),
  createDirectory: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock("webdav", () => ({
  AuthType: { Auto: "auto", Password: "password" },
  createClient: mocks.createClient,
}));

import { WebDAVAdapter, SyncError, toSyncError } from "../webdav-client";

function httpError(status: number) {
  const err: any = new Error(`Invalid response: ${status}`);
  err.status = status;
  return err;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockImplementation(() => ({
    getFileContents: mocks.getFileContents,
    createDirectory: mocks.createDirectory,
    deleteFile: mocks.deleteFile,
    putFileContents: vi.fn(),
    getDirectoryContents: vi.fn(),
  }));
});

describe("WebDAVAdapter.init", () => {
  const baseConfig = {
    enabled: true,
    url: "https://nas.example.com/dav",
    username: "user",
    password: "pwd",
  };

  it("reuses the client while credentials stay the same", () => {
    const adapter = new WebDAVAdapter();
    adapter.init(baseConfig);
    adapter.init(baseConfig);
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
  });

  it("rebuilds the client when the password changes", () => {
    const adapter = new WebDAVAdapter();
    adapter.init(baseConfig);
    adapter.init({ ...baseConfig, password: "new-pwd" });
    expect(mocks.createClient).toHaveBeenCalledTimes(2);
    expect(mocks.createClient.mock.calls[1][1]).toMatchObject({ password: "new-pwd" });
  });

  it("trims whitespace around url and credentials", () => {
    const adapter = new WebDAVAdapter();
    adapter.init({ ...baseConfig, url: " https://nas.example.com/dav/ ", username: " user ", password: "pwd\n" });
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://nas.example.com/dav",
      expect.objectContaining({ username: "user", password: "pwd" }),
    );
  });

  it("rejects a url without protocol", () => {
    const adapter = new WebDAVAdapter();
    expect(() => adapter.init({ ...baseConfig, url: "nas.example.com/dav" })).toThrowError(SyncError);
    expect(adapter.isInitialized).toBe(false);
  });
});

describe("WebDAVAdapter operations", () => {
  const config = {
    enabled: true,
    url: "https://nas.example.com/dav",
    username: "user",
    password: "pwd",
  };

  it("maps a 401 to an auth error instead of swallowing it", async () => {
    const adapter = new WebDAVAdapter();
    adapter.init(config);
    mocks.getFileContents.mockRejectedValue(httpError(401));

    await expect(adapter.getFileContents("/a.json")).rejects.toMatchObject({ code: "auth", status: 401 });
  });

  it("detects a 401 that the webdav package swallowed in digest mode", async () => {
    const adapter = new WebDAVAdapter();
    adapter.init(config);
    mocks.getFileContents.mockResolvedValue({ status: 401, data: "<html>Unauthorized</html>" });

    await expect(adapter.getFileContents("/a.json")).rejects.toMatchObject({ code: "auth" });
    await expect(adapter.checkAuth("/a.json")).rejects.toMatchObject({ code: "auth" });
  });

  it("returns null for a missing file", async () => {
    const adapter = new WebDAVAdapter();
    adapter.init(config);
    mocks.getFileContents.mockRejectedValue(httpError(404));

    await expect(adapter.getFileContents("/a.json")).resolves.toBeNull();
    await expect(adapter.checkAuth("/a.json")).resolves.toBeUndefined();
  });

  it("returns the file body from a detailed response", async () => {
    const adapter = new WebDAVAdapter();
    adapter.init(config);
    mocks.getFileContents.mockResolvedValue({ status: 200, data: '{"a":1}' });

    await expect(adapter.getFileContents("/a.json")).resolves.toBe('{"a":1}');
  });

  it("treats an existing directory as success", async () => {
    const adapter = new WebDAVAdapter();
    adapter.init(config);
    mocks.createDirectory.mockRejectedValue(httpError(405));

    await expect(adapter.ensureDirectory("/HamHomeSync/bookmarks/chunks")).resolves.toBeUndefined();
  });

  it("propagates auth failures when deleting", async () => {
    const adapter = new WebDAVAdapter();
    adapter.init(config);
    mocks.deleteFile.mockRejectedValue(httpError(401));

    await expect(adapter.deleteFile("/HamHomeSync")).rejects.toMatchObject({ code: "auth" });
  });
});

describe("toSyncError", () => {
  it("classifies http statuses", () => {
    expect(toSyncError(httpError(401)).code).toBe("auth");
    expect(toSyncError(httpError(403)).code).toBe("forbidden");
    expect(toSyncError(httpError(404)).code).toBe("notFound");
    expect(toSyncError(httpError(502)).code).toBe("server");
  });

  it("classifies fetch level failures as network errors", () => {
    expect(toSyncError(new TypeError("Failed to fetch")).code).toBe("network");
  });
});
