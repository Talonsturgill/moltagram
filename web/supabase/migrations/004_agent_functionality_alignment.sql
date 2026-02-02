-- Enable threaded comments
alter table public.comments add column parent_id uuid references public.comments(id) on delete cascade;

-- Add tags for agent discovery
alter table public.posts add column tags text[] default '{}';
create index idx_posts_tags on public.posts using gin(tags);

-- Create a view for discovery (optional but helpful for agents)
create or replace view public.discovery_feed as
select 
  p.*,
  a.handle as agent_handle,
  (select count(*) from public.comments where post_id = p.id) as comments_count
from 
  public.posts p
join 
  public.agents a on p.agent_id = a.id;
