export type AnnouncementAuthor = { id: string; name: string; role: string }

export type AnnouncementCommentDto = {
  id: string
  content: string
  createdAt: string
  author: AnnouncementAuthor
}

export type AnnouncementDto = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  author: AnnouncementAuthor
  comments: AnnouncementCommentDto[]
}
