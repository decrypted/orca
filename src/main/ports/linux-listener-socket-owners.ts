import { readdir, readlink } from 'node:fs/promises'

const SOCKET_LINK_PATTERN = /^socket:\[(\d+)\]$/

let ownerPidByInode = new Map<number, number>()

/** Map listening-socket inodes to the highest pid holding them, reusing an owner only while it still holds its socket. */
export async function resolveLinuxListenerSocketOwners(
  inodes: ReadonlySet<number>
): Promise<Map<number, number>> {
  const owners = new Map<number, number>()
  await verifyRememberedOwners(inodes, owners)
  const pending = new Set([...inodes].filter((inode) => !owners.has(inode)))
  if (pending.size > 0) {
    await findHighestOwnerPids(pending, owners)
  }
  ownerPidByInode = new Map(owners)
  return owners
}

async function verifyRememberedOwners(
  inodes: ReadonlySet<number>,
  owners: Map<number, number>
): Promise<void> {
  const expectedByPid = new Map<number, Set<number>>()
  for (const inode of inodes) {
    const pid = ownerPidByInode.get(inode)
    if (pid === undefined) {
      continue
    }
    const expected = expectedByPid.get(pid) ?? new Set<number>()
    expected.add(inode)
    expectedByPid.set(pid, expected)
  }
  for (const [pid, expected] of expectedByPid) {
    await scanPidSockets(pid, claimSockets(expected, owners, pid))
  }
}

// Descending order keeps the old walk's last-visited (highest) owner and reaches new listeners' processes first.
async function findHighestOwnerPids(
  pending: Set<number>,
  owners: Map<number, number>
): Promise<void> {
  let pids: number[]
  try {
    pids = (await readdir('/proc'))
      .filter((entry) => /^\d+$/.test(entry))
      .map((entry) => Number.parseInt(entry, 10))
      .sort((a, b) => b - a)
  } catch {
    return
  }
  for (const pid of pids) {
    if (await scanPidSockets(pid, claimSockets(pending, owners, pid))) {
      return
    }
  }
}

function claimSockets(
  wanted: Set<number>,
  owners: Map<number, number>,
  pid: number
): (inode: number) => boolean {
  return (inode) => {
    if (wanted.delete(inode)) {
      owners.set(inode, pid)
    }
    return wanted.size === 0
  }
}

/** Visit each socket inode the pid holds until onSocket returns true; returns whether it stopped early. */
async function scanPidSockets(pid: number, onSocket: (inode: number) => boolean): Promise<boolean> {
  let fds: string[]
  try {
    fds = await readdir(`/proc/${pid}/fd`)
  } catch {
    return false
  }
  for (const fd of fds) {
    let link: string
    try {
      link = await readlink(`/proc/${pid}/fd/${fd}`)
    } catch {
      continue
    }
    const match = SOCKET_LINK_PATTERN.exec(link)
    if (match && onSocket(Number.parseInt(match[1], 10))) {
      return true
    }
  }
  return false
}
