require 'neo4j'

class Page
  include Neo4j::ActiveNode
  property :name, :index => :exact, :constraint => :unique, :type => String
  has_many :out, :pages, :class => Page, :type => 'link_to'
end
