/** A populated owner/member reference: Room.controller.js populates `name email`,
 * and Mongoose always includes `_id` alongside a populate select. */
export interface RoomMember {
  _id: string;
  name: string;
  email: string;
}

/** Matches the `room` object returned by the room endpoints
 * (create/join/get-by-id all populate owner + members the same way). */
export interface Room {
  _id: string;
  name: string;
  code: string;
  owner: RoomMember;
  members: RoomMember[];
  createdAt: string;
}